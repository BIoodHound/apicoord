# M1 — File I/O: open, save, encoding, line endings

**Research:** `text-file-roundtrip.md`, `tauri-ipc-patterns.md`, `tauri-capabilities.md`. **Decision:** council m1 #2, #10, rules 8, 9, 12.

## Goal
Open and save local spec files from Rust so that an unedited file round-trips byte-identically and an edited one keeps its encoding, BOM and line endings.

## User-visible behaviour
- Open picks a `.yaml/.yml/.json` file (filter is a hint only) and the text appears in the editor. The status bar shows `UTF-8`, `LF`/`CRLF` (and `BOM` when present).
- Save with no edits leaves the file's bytes untouched. Save after edits writes the buffer with the file's original encoding, BOM, and the **majority EOL** (ties → LF). A mixed-EOL file shows a one-time status-bar note "Mixed line endings: saving as CRLF".
- A new/untitled buffer would default to UTF-8, no BOM, LF — but M1 has no New command, so this only applies to Save As of a buffer opened from disk (inherits its metadata).
- A legacy-encoded file (not UTF-8/UTF-16 with BOM) is refused with: "This file isn't UTF-8 or UTF-16 and can't be opened safely."
- Save failure (locked file, no permission) shows an error and leaves the buffer dirty.

## API shape (detail in `ipc-contract.md`)
- `open_spec_dialog() -> Option<OpenedSpec>`; `open_recent(path) -> OpenedSpec`
- `save_spec(text, clean: bool) -> SaveResult`; `save_spec_as(text, clean: bool) -> Option<SaveResult>` (Rust shows the save dialog)
- `OpenedSpec { path, text, encoding, hasBom, eol, majorityEol, mixedEol, openapiVersion }` — `text` has BOM stripped; Monaco's EOL is set to the detected one.
- Errors: `unsupported_encoding`, `not_issued`, `io_error`, `locked`.

## Data
Files only. `AppState.issued_paths` allow-list. Text codec: UTF-8, UTF-16LE/BE (hand-written encode in `textcodec.rs`; `encoding_rs` cannot encode UTF-16).

## Acceptance criteria
- Open→Save-without-edit→compare: bytes identical for every EOL/encoding fixture (LF, CRLF, mixed, UTF-8 BOM, UTF-16LE, no-final-newline).
- Open→edit→save: UTF-16LE file stays UTF-16LE with BOM; UTF-8 BOM stays; no-final-newline stays without one; CRLF file stays CRLF; mixed file saves with its majority EOL.
- Save As of a clean (unedited) buffer writes the original bytes to the new path (operator Q4; leaning accepted).
- `legacy-latin1.yaml` returns `unsupported_encoding`; no partial state is set.
- Writes are atomic: temp file in same directory then rename; a simulated rename failure leaves the original intact; lock errors retry 5×50ms then return `locked`.
- A command given a path Rust never issued (not a dialog result, current doc or MRU entry) returns `not_issued` and touches no file.
- Open of a 10k-line file returns in <100ms in Rust (measured in a Rust test on dev hardware, informational).
- After successful Save As the current path and Recent list update; the window title shows the new file name.
- Frontend never imports `@tauri-apps/plugin-fs` (lint/grep test).

## Non-goals
Legacy codec support; preserving mixed EOLs; autosave (brief lists it for v1 but not M1); file watching; creating new files.

## Open questions for the operator
- Save As on an unedited buffer: original bytes (assumed) vs re-encode.
- Mixed-EOL after edit: no prompt, status-bar note only (assumed).
- Show encoding and EOL in the status bar (assumed yes).
