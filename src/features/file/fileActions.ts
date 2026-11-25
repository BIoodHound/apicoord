// The single file-action dispatcher (architecture §4, §6.5, §7, §12).
// Every input source (menu event, shortcut, window close) calls this; only this calls the file IPC.
//
// Skeleton: the editor and the dirty prompt plug in through `registerEditorBridge` /
// `registerDirtyPrompt` (Monaco owns the buffer, the prompt is a webview modal). Later tasks
// fill in title sync, schema binding and immediate re-parse around these calls.
import { closeDocument, openRecent as ipcOpenRecent, openSpecDialog, saveSpec, saveSpecAs } from '../../ipc/file'
import { exitApp } from '../../ipc/app'
import { errorMessage, isAppError } from '../../ipc/errors'
import type { OpenedSpec, SaveResult } from '../../ipc/types'
import { useStore } from '../../state/store'
import { detectLanguage } from '../editor/language'

export interface FileActions {
  open(): Promise<void>
  openRecent(path: string): Promise<void>
  save(): Promise<boolean>
  saveAs(): Promise<boolean>
  close(): Promise<void>
  exit(): Promise<void>
  windowClose(): Promise<void>
  confirmDiscardIfDirty(): Promise<boolean>
}

/** What fileActions needs from the editor. Monaco's EditorPane registers it. */
export interface EditorBridge {
  getText(): string
  /** Replaces the model with the opened text (and its EOL); returns the new saved version id. */
  load(spec: OpenedSpec): number
  /** Current alternative version id, recorded as "saved" after a successful save. */
  getVersionId(): number
  /** Disposes the model. */
  clear(): void
}

export type DirtyChoice = 'save' | 'discard' | 'cancel'
export type DirtyPrompt = (fileName: string) => Promise<DirtyChoice>

let editor: EditorBridge | null = null
let prompt: DirtyPrompt | null = null

export function registerEditorBridge(bridge: EditorBridge | null): void {
  editor = bridge
}
export function registerDirtyPrompt(fn: DirtyPrompt | null): void {
  prompt = fn
}

const log = (...args: unknown[]) => console.error('[apicoord:file]', ...args)

function applyOpened(spec: OpenedSpec): void {
  const savedVersionId = editor ? editor.load(spec) : 0
  const meta = {
    path: spec.path,
    fileName: spec.fileName,
    encoding: spec.encoding,
    hasBom: spec.hasBom,
    eol: spec.eol,
    mixedEol: spec.mixedEol,
    openapiVersion: spec.openapiVersion,
  }
  useStore.getState().openDocument(meta, detectLanguage(spec.fileName, spec.text), savedVersionId)
}

function applySaved(result: SaveResult): void {
  const s = useStore.getState()
  s.updateDocument({
    path: result.path,
    fileName: result.fileName,
    encoding: result.encoding,
    hasBom: result.hasBom,
    eol: result.eol,
    mixedEol: false,
  })
  if (editor) s.setSavedVersionId(editor.getVersionId())
  s.setDirty(false)
  s.setNotice(
    result.eolNormalised ? `Mixed line endings: saved as ${result.eol.toUpperCase()}` : null,
  )
}

function fail(e: unknown): void {
  log(isAppError(e) ? e.code : 'error')
  useStore.getState().setNotice(errorMessage(e))
}

async function doSave(asNew: boolean): Promise<boolean> {
  const s = useStore.getState()
  if (!s.doc || !editor) return false
  const text = editor.getText()
  const clean = !s.dirty
  try {
    const result = asNew ? await saveSpecAs(text, clean) : await saveSpec(text, clean)
    if (result === null) return false
    applySaved(result)
    return true
  } catch (e) {
    fail(e)
    return false
  }
}

async function confirmDiscardIfDirty(): Promise<boolean> {
  const s = useStore.getState()
  if (!s.dirty || !s.doc) return true
  if (!prompt) return false // no way to ask: never lose edits silently
  const choice = await prompt(s.doc.fileName)
  if (choice === 'discard') return true
  if (choice === 'save') return doSave(false)
  return false
}

export const fileActions: FileActions = {
  async open() {
    if (!(await confirmDiscardIfDirty())) return
    try {
      const spec = await openSpecDialog()
      if (spec) applyOpened(spec)
    } catch (e) {
      fail(e)
    }
  },

  async openRecent(path) {
    if (!(await confirmDiscardIfDirty())) return
    try {
      applyOpened(await ipcOpenRecent(path))
    } catch (e) {
      if (isAppError(e) && e.code === 'not_found') {
        const name = path.split(/[\\/]/).pop() ?? path
        useStore.getState().setNotice(`${name} no longer exists`)
      } else {
        fail(e)
      }
    }
  },

  save: () => doSave(false),
  saveAs: () => doSave(true),

  async close() {
    if (!(await confirmDiscardIfDirty())) return
    try {
      await closeDocument()
      editor?.clear()
      useStore.getState().closeDocument()
    } catch (e) {
      fail(e)
    }
  },

  async exit() {
    if (!(await confirmDiscardIfDirty())) return
    try {
      await exitApp()
    } catch (e) {
      fail(e)
    }
  },

  async windowClose() {
    if (!(await confirmDiscardIfDirty())) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().destroy()
  },

  confirmDiscardIfDirty,
}
