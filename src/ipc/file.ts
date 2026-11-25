import { call } from './invoke'
import type { OpenedSpec, SaveResult } from './types'

/** Shows the native open dialog in Rust. `null` = user cancelled. */
export function openSpecDialog(): Promise<OpenedSpec | null> {
  return call<OpenedSpec | null>('open_spec_dialog')
}

/** Opens a Recent entry. `path` must be one Rust issued (dialog result, current doc, MRU). */
export function openRecent(path: string): Promise<OpenedSpec> {
  return call<OpenedSpec>('open_recent', { path })
}

/** Saves the current document. `clean=true` writes the original bytes unchanged. */
export function saveSpec(text: string, clean: boolean): Promise<SaveResult> {
  return call<SaveResult>('save_spec', { text, clean })
}

/** Rust shows the save dialog. `null` = user cancelled. */
export function saveSpecAs(text: string, clean: boolean): Promise<SaveResult | null> {
  return call<SaveResult | null>('save_spec_as', { text, clean })
}

/** Clears the current document on the Rust side (after the dirty guard passed). */
export function closeDocument(): Promise<void> {
  return call<void>('close_document')
}
