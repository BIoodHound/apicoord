// The single UI store (architecture §6.1). It doubles as the in-webview event bus (§4, D17).
// The buffer text is NOT stored here: Monaco owns it (D11).
import { create } from 'zustand'
import type { Eol, OpenApiVersion, RecentEntry, TextEncoding } from '../ipc/types'

export type Language = 'yaml' | 'json'

export type PreviewStatus =
  | { kind: 'none' }
  | { kind: 'ok' }
  | { kind: 'stale'; line: number; message: string }
  | { kind: 'empty-invalid'; line: number; message: string }

export interface DocMeta {
  path: string
  fileName: string
  encoding: TextEncoding
  hasBom: boolean
  eol: Eol
  mixedEol: boolean
  openapiVersion: OpenApiVersion | null
}

export interface DocumentSlice {
  doc: DocMeta | null
  language: Language
  /** Session-only (Q5): survives Save As, resets on open. */
  languageOverridden: boolean
  savedVersionId: number
  dirty: boolean
}

export interface PreviewSlice {
  previewStatus: PreviewStatus
  spec: Record<string, unknown> | null
  specHash: string | null
  lastSeq: number
}

export interface ValidationSlice {
  markerCount: number
}

export interface UiSlice {
  recent: RecentEntry[]
  notice: string | null
  cursor: { line: number; col: number }
}

export type StoreData = DocumentSlice & PreviewSlice & ValidationSlice & UiSlice

export interface StoreActions {
  /** Replaces the document metadata; resets dirty, override, preview and markers. */
  openDocument(doc: DocMeta, language: Language, savedVersionId: number): void
  /** Updates path/encoding/EOL after a save; keeps the language override. */
  updateDocument(patch: Partial<DocMeta>): void
  closeDocument(): void
  setLanguage(language: Language, overridden: boolean): void
  setSavedVersionId(id: number): void
  setDirty(dirty: boolean): void
  setPreviewStatus(status: PreviewStatus): void
  setSpec(spec: Record<string, unknown>, hash: string): void
  setLastSeq(seq: number): void
  setMarkerCount(count: number): void
  setRecent(recent: RecentEntry[]): void
  setNotice(notice: string | null): void
  setCursor(line: number, col: number): void
  /** Test helper: back to the initial state. */
  reset(): void
}

export type Store = StoreData & StoreActions

export const initialState: StoreData = {
  doc: null,
  language: 'yaml',
  languageOverridden: false,
  savedVersionId: 0,
  dirty: false,
  previewStatus: { kind: 'none' },
  spec: null,
  specHash: null,
  lastSeq: 0,
  markerCount: 0,
  recent: [],
  notice: null,
  cursor: { line: 1, col: 1 },
}

export const useStore = create<Store>()((set) => ({
  ...initialState,
  openDocument: (doc, language, savedVersionId) =>
    set({
      doc,
      language,
      languageOverridden: false,
      savedVersionId,
      dirty: false,
      previewStatus: { kind: 'none' },
      spec: null,
      specHash: null,
      markerCount: 0,
      cursor: { line: 1, col: 1 },
    }),
  updateDocument: (patch) => set((s) => (s.doc ? { doc: { ...s.doc, ...patch } } : {})),
  closeDocument: () =>
    set({
      doc: null,
      languageOverridden: false,
      dirty: false,
      previewStatus: { kind: 'none' },
      spec: null,
      specHash: null,
      markerCount: 0,
      cursor: { line: 1, col: 1 },
    }),
  setLanguage: (language, overridden) => set({ language, languageOverridden: overridden }),
  setSavedVersionId: (savedVersionId) => set({ savedVersionId }),
  setDirty: (dirty) => set({ dirty }),
  setPreviewStatus: (previewStatus) => set({ previewStatus }),
  setSpec: (spec, specHash) => set({ spec, specHash }),
  setLastSeq: (lastSeq) => set({ lastSeq }),
  setMarkerCount: (markerCount) => set({ markerCount }),
  setRecent: (recent) => set({ recent }),
  setNotice: (notice) => set({ notice }),
  setCursor: (line, col) => set({ cursor: { line, col } }),
  reset: () => set({ ...initialState }),
}))
