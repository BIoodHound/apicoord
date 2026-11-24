# APICoord — IPC contract

> The architect-desktop owns this file. It is the source of truth for which Rust
> `#[tauri::command]` functions exist and what they accept / return. Keep in sync
> with the actual Rust registry in `src-tauri/src/lib.rs` and the TS wrappers in
> `src/ipc/`.

## Conventions
- Rust command signatures listed in snake_case; TS wrappers expose them in camelCase (via `#[serde(rename_all = "camelCase")]`).
- Every command is `async` on the Rust side and returns `Result<T, AppError>`.
- Errors carry `{ code: string, message: string }` on the TS side.
- Events are one-way (Rust → TS) and carry a typed payload.

## Commands

### Health

| Command | Args | Returns | Errors | Capability |
|---|---|---|---|---|
| `ping` | — | `String` | — | `core:default` |

(Add real commands as they're introduced during Increment 1+.)

## Events

| Event | Payload | Emitter |
|---|---|---|

(Add as needed.)
