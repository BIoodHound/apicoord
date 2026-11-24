# APICoord — Architecture

> The architect-desktop owns this document. Updated by them only.
> Everyone else reads it to know where things go.

## System shape

(Tauri shell. Frontend in the OS webview. Rust backend in the same process. IPC between them.)

## Modules & ownership

| Area | Owner agent | Location |
|---|---|---|
| Tauri entry + command registry | architect-desktop | `src-tauri/src/lib.rs` |
| IPC command implementations | rust-dev | `src-tauri/src/commands/<domain>.rs` |
| Internal services / business logic | rust-dev | `src-tauri/src/services/` |
| Shared types (serde) | architect-desktop + rust-dev | `src-tauri/src/models/` |
| Error enum | rust-dev | `src-tauri/src/error.rs` |
| Tauri config | architect-desktop | `src-tauri/tauri.conf.json` |
| Capabilities | architect-desktop | `src-tauri/capabilities/*.json` |
| React pages | frontend-dev-tauri | `src/pages/` |
| Components | frontend-dev-tauri | `src/components/` |
| Feature slices | frontend-dev-tauri | `src/features/<domain>/` |
| IPC wrappers (typed) | frontend-dev-tauri | `src/ipc/<domain>.ts` |
| Hooks | frontend-dev-tauri | `src/hooks/` |
| Styles / theme | frontend-dev-tauri | `src/styles/` |
| Rust tests | qa-engineer | `src-tauri/tests/tasks/task_<id>/` |
| Frontend tests | qa-engineer | `src/__tests__/tasks/task_<id>/` |
| Packaging, installer, CI | packaging-engineer | `packaging/`, `.github/workflows/`, `scripts/release/` |

## IPC contract

(See `ipc-contract.md`. Keep in sync with any change to Rust `#[tauri::command]` or TS `src/ipc/` wrappers.)

## State flow

(Where state lives — Tauri managed state on Rust side? React context? Zustand?)

## Cross-cutting concerns

- **Error handling:** typed `AppError` in Rust → `String` across IPC → TS throws `AppError { code, message }`.
- **Logging:** `tracing` on the Rust side; frontend uses console with structured prefixes.
- **State persistence:** Tauri's `plugin-store` or custom JSON at `app_data_dir()`.
- **Settings:** user-editable settings file at `app_config_dir()/settings.json`.

## Conventions

- Snake_case in Rust / camelCase in TS; `#[serde(rename_all = "camelCase")]` on boundary types.
- Every IPC command is `async` and returns `Result<T, AppError>`.
- No `unwrap()` outside initialization.
- Capabilities are additive and narrow — never widen `capabilities/default.json`; add new capability files per feature.
- Lazy-load Monaco and swagger-ui-react to keep cold start fast.
- Keyboard shortcuts follow Windows conventions on Windows (Ctrl+S, Ctrl+Shift+P, etc.).
