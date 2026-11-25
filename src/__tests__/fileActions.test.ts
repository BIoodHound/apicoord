import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { detectLanguage } from '../features/editor/language'
import { fileActions, registerDirtyPrompt, registerEditorBridge } from '../features/file/fileActions'
import { useStore } from '../state/store'
import type { OpenedSpec } from '../ipc/types'

const doc = {
  path: 'C:\\a.yaml', fileName: 'a.yaml', encoding: 'utf-8', hasBom: false,
  eol: 'lf', mixedEol: false, openapiVersion: '3.1',
} as const

describe('detectLanguage', () => {
  it('uses the extension table, then the first non-blank char', () => {
    expect(detectLanguage('a.YML', '{')).toBe('yaml')
    expect(detectLanguage('a.json', 'openapi: 3')).toBe('json')
    expect(detectLanguage('spec', '  \n{ "openapi": "3.1.0" }')).toBe('json')
    expect(detectLanguage('spec', 'openapi: 3.1.0')).toBe('yaml')
  })
})

describe('fileActions', () => {
  beforeEach(() => {
    useStore.getState().reset()
    vi.mocked(invoke).mockReset()
    registerEditorBridge({ getText: () => 'x', load: () => 7, getVersionId: () => 9, clear: () => {} })
    registerDirtyPrompt(null)
  })

  it('confirmDiscardIfDirty is true for a clean buffer without prompting', async () => {
    const p = vi.fn()
    registerDirtyPrompt(p)
    expect(await fileActions.confirmDiscardIfDirty()).toBe(true)
    expect(p).not.toHaveBeenCalled()
  })

  it('cancel on a dirty buffer aborts close', async () => {
    useStore.getState().openDocument({ ...doc }, 'yaml', 1)
    useStore.getState().setDirty(true)
    registerDirtyPrompt(async () => 'cancel')
    await fileActions.close()
    expect(vi.mocked(invoke)).not.toHaveBeenCalled()
    expect(useStore.getState().doc).not.toBeNull()
  })

  it('open loads the spec into the store with the detected language', async () => {
    const spec: OpenedSpec = { ...doc, path: 'C:\\b.json', fileName: 'b.json', text: '{}' }
    vi.mocked(invoke).mockResolvedValue(spec)
    await fileActions.open()
    const s = useStore.getState()
    expect(s.doc?.fileName).toBe('b.json')
    expect(s.language).toBe('json')
    expect(s.savedVersionId).toBe(7)
  })

  it('a failed save keeps the buffer dirty and shows the message', async () => {
    useStore.getState().openDocument({ ...doc }, 'yaml', 1)
    useStore.getState().setDirty(true)
    vi.mocked(invoke).mockRejectedValue({ code: 'locked', message: 'The file is locked.' })
    expect(await fileActions.save()).toBe(false)
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('save_spec', { text: 'x', clean: false })
    expect(useStore.getState().dirty).toBe(true)
    expect(useStore.getState().notice).toBe('The file is locked.')
  })
})
