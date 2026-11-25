# APICoord — IPC contract

## 5. Rust ↔ UI contract (commands, events, types) — authoritative

`design/ipc-contract.md` mirrors this section verbatim (copied in T001); change both files together, in the same task.

### 5.1 Commands

All commands are `async`, return `Result<T, AppError>`, and run on the tokio pool. Dialogs use the Rust `tauri_plugin_dialog::DialogExt` **blocking** API, which is legal off the main thread and gives the webview no dialog capability.

| Command | Args (TS) | Returns | Errors | Notes |
|---|---|---|---|---|
| `ping` | — | `string` | — | unchanged |
| `open_spec_dialog` | — | `OpenedSpec \| null` | `unsupported_encoding`, `io_error` | `null` = user cancelled. Filter `yaml,yml,json` is a hint (an "All files" filter is also offered). On success: path → `issued`, `current` replaced, MRU move-to-front, emits `recent://changed`, rebuilds Recent submenu, enables Save/Save As/Close. On error: **no state change**. |
| `open_recent` | `{ path: string }` | `OpenedSpec` | `not_issued`, `not_found`, `unsupported_encoding`, `io_error` | `path` must be in `issued`. On `not_found` Rust removes the entry, persists it and emits `recent://changed`; the frontend shows "<name> no longer exists". |
| `save_spec` | `{ text: string, clean: boolean }` | `SaveResult` | `no_document`, `locked`, `io_error` | `clean=true` → writes `current.original_bytes` unchanged (`wrote=false` if the file still has identical bytes, so the write is skipped). `clean=false` → normalise every `\r\n`/`\r`/`\n` to `current.eol`, prepend BOM if `has_bom`, encode with `current.encoding`, atomic write, then `original_bytes = written bytes` and `mixed_eol=false`. |
| `save_spec_as` | `{ text: string, clean: boolean }` | `SaveResult \| null` | `no_document`, `locked`, `io_error` | Rust shows the save dialog (default name = current file name). `clean=true` → original bytes to the new path (Q4). The new path goes into `issued` and becomes `current.path`; MRU updated, event emitted. `null` = cancelled. |
| `close_document` | — | `void` | — | Clears `current`, disables Save/Save As/Close. Called by the frontend after the dirty guard passes. |
| `list_recent` | — | `RecentEntry[]` | — | Most recent first, ≤5. |
| `get_schema` | `{ version: "3.0" \| "3.1" }` | `string` (JSON text) | `internal` (only if the bundled copy is also unparsable, which can't happen) | Frontend calls `JSON.parse` once and caches per version. |
| `exit_app` | — | `void` | — | Lives in `commands/app.rs`. Called by the frontend after the dirty guard for menu Exit; `app.exit(0)`. |

Window close (X / Alt+F4) has no command: `onCloseRequested` → guard → `getCurrentWindow().destroy()`.
**Complete webview permission list:** `core:default`, `core:window:allow-set-title`, `core:window:allow-destroy`.
Menu enable/disable (Save/Save As/Close) is driven by Rust from the `current` transitions in `open_*`/`close_document`, and the webview never toggles it.

**The allow-list rule:** the only command that takes a path is `open_recent`. Its path must already be in `issued`: from a dialog result, the current document, or a loaded MRU entry. Paths are compared in normalised form (§5.4).

**Atomic write** (`core::fsx::atomic_write(path, bytes)`): write `.<name>.apicoord-tmp-<pid>` in the same dir → `sync_all` → `rename` over the target. On Windows, `ERROR_SHARING_VIOLATION`/`ERROR_LOCK_VIOLATION`/`ERROR_ACCESS_DENIED` on rename get **5 retries × 50ms**, then `locked`. The temp file is removed on any failure, and the original is never truncated first.

### 5.2 Events (Rust → webview)

| Event | Payload | Emitted when |
|---|---|---|
| `menu://action` | `MenuEvent { action: MenuAction, path?: string }` | A native menu item is activated. Rust **never** performs file actions from the menu itself, because the dirty guard lives in the webview. |
| `recent://changed` | `RecentEntry[]` | After any MRU mutation |

`MenuAction = "open" | "save" | "save-as" | "close" | "recent" | "exit"`; `path` is set only for `"recent"`. Menu item IDs: `file.open`, `file.save`, `file.save-as`, `file.close`, `file.exit`, `file.recent.<0..4>`. **Exit is a normal item, not `PredefinedMenuItem::quit`**, because the predefined item would bypass the dirty guard.

### 5.3 Types

Rust: `#[serde(rename_all = "camelCase")]` on structs. TS mirrors live in `src/ipc/types.ts`.

```ts
export type TextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be'
export type Eol = 'lf' | 'crlf'
export type OpenApiVersion = '3.0' | '3.1'

export interface OpenedSpec {
  path: string; fileName: string
  text: string              // decoded, BOM stripped, EOLs exactly as on disk
  encoding: TextEncoding; hasBom: boolean
  eol: Eol                  // majority EOL (ties → lf; no line breaks → lf); also what an edited save writes
  mixedEol: boolean
  openapiVersion: OpenApiVersion | null   // sniffed from top-level `openapi:` / "openapi"; null → frontend uses 3.1
}
export interface SaveResult {
  path: string; fileName: string
  encoding: TextEncoding; hasBom: boolean; eol: Eol
  wrote: boolean            // false when a clean save found identical bytes and skipped
  eolNormalised: boolean    // true when this save converted a mixed-EOL file → status-bar note
}
export interface RecentEntry { path: string; fileName: string; lastOpened: number /* unix ms */ }
export interface MenuEvent { action: MenuAction; path?: string }
export interface AppError { code: AppErrorCode; message: string }
export type AppErrorCode =
  'unsupported_encoding' | 'not_issued' | 'not_found' | 'no_document' | 'locked' | 'io_error' | 'internal'
```

Change from the spec: `OpenedSpec.majorityEol` is folded into `eol`, because they were always equal by definition, and `mixedEol` carries the extra information.

```rust
// core/src/error.rs — the IPC error shape. Serialises as {"code":"locked","message":"..."}
#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "code", content = "message", rename_all = "snake_case")]
pub enum AppError {
    #[error("{0}")] UnsupportedEncoding(String), #[error("{0}")] NotIssued(String),
    #[error("{0}")] NotFound(String),            #[error("{0}")] NoDocument(String),
    #[error("{0}")] Locked(String),              #[error("{0}")] IoError(String),
    #[error("{0}")] Internal(String),
}
```
Tauri rejects the `invoke` promise with that **object**, not a string, so the existing comment in `src-tauri/src/error.rs` about `Display`/`code:` prefixes is wrong and should go. The TS wrappers rethrow it typed as `AppError`. Messages are human-readable sentences. `unsupported_encoding` → "This file isn't UTF-8 or UTF-16 and can't be opened safely."

### 5.4 Text and path rules (core)

- **Decode:** BOM `EF BB BF` → UTF-8+BOM; `FF FE` → UTF-16LE; `FE FF` → UTF-16BE; otherwise strict `std::str::from_utf8` → UTF-8, and anything else → `unsupported_encoding`. BOM-less UTF-16 is unsupported. Decoding is std-only (`String::from_utf8`, `char::decode_utf16`). **No `encoding_rs`**, because it can't encode UTF-16 and we don't support legacy codecs.
- **EOL count:** `crlf` = count of `\r\n`, `lf` = lone `\n`, lone `\r` counted as lf. `mixed = crlf>0 && lf>0`. Majority: crlf if crlf>lf else lf.
- **Encode:** UTF-8 → bytes; UTF-16 → `encode_utf16` → `to_le_bytes`/`to_be_bytes`; prepend the BOM when `has_bom`.
- **Path normalisation (`NormPath`)** is used for `issued` lookups and MRU de-dup only. The original path string is kept for display and IO. Steps: strip the `\\?\` prefix (`\\?\UNC\` → `\\`), convert `/` to `\` on Windows, then lowercase on Windows only.
- **Version sniff:** scan the first 200 lines for `^\s*["']?openapi["']?\s*:\s*["']?(3\.[01])\.` → `3.0`/`3.1`, else `null`. It is a regex, not a YAML parse, so it stays fast.
