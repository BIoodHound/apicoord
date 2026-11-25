// IPC boundary types: TS mirror of design/ipc-contract.md §5.2–§5.3.
// Rust structs use `#[serde(rename_all = "camelCase")]`; keep field names identical.

export type TextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be'
export type Eol = 'lf' | 'crlf'
export type OpenApiVersion = '3.0' | '3.1'

export interface OpenedSpec {
  path: string
  fileName: string
  /** Decoded, BOM stripped, EOLs exactly as on disk. */
  text: string
  encoding: TextEncoding
  hasBom: boolean
  /** Majority EOL (ties and no line breaks give lf); also what an edited save writes. */
  eol: Eol
  mixedEol: boolean
  /** Sniffed from the top-level `openapi` field; null means the frontend uses 3.1. */
  openapiVersion: OpenApiVersion | null
}

export interface SaveResult {
  path: string
  fileName: string
  encoding: TextEncoding
  hasBom: boolean
  eol: Eol
  /** False when a clean save found identical bytes and skipped the write. */
  wrote: boolean
  /** True when this save converted a mixed-EOL file (status-bar note). */
  eolNormalised: boolean
}

export interface RecentEntry {
  path: string
  fileName: string
  /** Unix epoch milliseconds. */
  lastOpened: number
}

export type MenuAction = 'open' | 'save' | 'save-as' | 'close' | 'recent' | 'exit'

export interface MenuEvent {
  action: MenuAction
  /** Set only when action is "recent". */
  path?: string
}

export interface AppError {
  code: AppErrorCode
  message: string
}

export type AppErrorCode =
  | 'unsupported_encoding'
  | 'not_issued'
  | 'not_found'
  | 'no_document'
  | 'locked'
  | 'io_error'
  | 'internal'
