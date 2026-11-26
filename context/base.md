# Product brief

# APICoord — Product Brief

> Vision, scope, and non-negotiables. Operator-owned document.
> The review board reads this before every increment.

## One-line pitch

A fast, local-first Windows desktop app that lets engineers edit OpenAPI specs (3.0 and 3.1, YAML or JSON) by typing in Monaco on one side and seeing a live Swagger-style view on the other, with an embedded terminal for an external AI assistant (e.g. Claude Code) to help navigate the spec via a generated "reader" file.

## Users and their jobs-to-be-done

- **Primary users:** Leo and colleagues at work who edit OpenAPI specs frequently and lose time jumping around large documents.
- **Secondary (future):** engineers on other teams and independent OpenAPI authors.
- **Jobs:**
  - Open a large OpenAPI spec and find a specific operation / schema / security scheme quickly.
  - Edit the spec with proper YAML/JSON awareness (schema validation, autocomplete, linting) and immediate visual feedback.
  - Point an AI agent at the spec and ask it to find or summarize parts, without leaving the editor window.
  - Save the edited spec back to disk reliably; no cloud, no accounts, no account "noise".

## Scope — in / out

**In scope for v1 (3 increments, see below):**
- Open and edit local files: OpenAPI 3.0 and 3.1, YAML or JSON. Save, Save As, autosave.
- Split layout: Monaco editor on one side, `swagger-ui-react` view on the other.
- Live sync: typing in Monaco debounced-parses and updates the Swagger view (last-good parse retained on error).
- Click an operation in the Swagger view → cursor jumps to that YAML/JSON line in Monaco.
- Live validation: schema validation against the OpenAPI 3.0 / 3.1 schemas with red squiggles and inline messages.
- Performance targets (Windows 10 1809+, Pi-class hardware is not the target — modern laptops):
  - Cold start < 500ms
  - Open and render a 10,000-line spec < 500ms
  - Keystroke → preview update p95 < 250ms
  - Scroll the editor and preview at a sustained 60fps
- "Reader" file: on every save, write `<spec-name>.reader.md` next to the spec — a human- and LLM-friendly map (TOC of paths and operations with line numbers back to the YAML, schemas and where they're used, security schemes, tags, any validation warnings).
- "Copy context for Claude" command (keyboard shortcut + menu): copies a structured block to the clipboard with the current spec path, the reader file path, the current cursor line, and the current selection.
- Embedded terminal pane inside the app window:
  - Real OS shell via a PTY (default `pwsh.exe` on Windows; user-overridable).
  - Launches with the spec folder as the working directory.
  - Preloads env vars `OPENAPI_FILE`, `READER_FILE`, `APP_CURRENT_LINE` (updated on save and when the cursor moves significantly).
  - Multiple tabs supported.
- No telemetry, no analytics, no network calls (schema fetch for validation is the only exception, and the user can disable it).

**Explicitly out of scope for v1 — deferred to future increments (not "never"):**
- Multi-file / external `$ref` resolution (the kind of reference that points to another file on disk or a URL).
- Diff mode (two specs side-by-side, highlighted differences).
- In-app chat with Anthropic / OpenAI / Ollama (we have a terminal; the user brings their own agent).
- Export to other formats (e.g. Markdown documentation, Postman collection, ReDoc static site).
- New-spec templates / wizards.
- Git integration (commit/push from inside the app).
- macOS and Linux builds.

**Permanently out of scope:**
- Hosted / cloud spec storage.
- Accounts, sync, sharing, collaboration features.
- Running the described API (making requests, response validation of live services).
- AI model inference inside the app binary (we are not shipping a bundled model).

## Non-functional requirements

- **Platform:** Windows 10 1809+ for v1. macOS / Linux deferred.
- **Startup:** cold start < 500ms, measured from user double-click to first paint.
- **Memory:** < 200MB at idle with one small spec open; < 500MB with a 10k-line spec open.
- **Large-file:** open a 10,000-line YAML spec in < 500ms; scroll at 60fps.
- **Live-sync latency:** keystroke → preview p95 < 250ms.
- **Offline:** fully offline-capable. The only optional network call is fetching the OpenAPI JSON schema for Monaco validation; cached after first fetch, disable-able in settings.
- **Accessibility:** WCAG 2.1 AA for custom UI; respect OS high-contrast and DPI scaling.
- **Security:** no telemetry, no analytics, no automatic update calls on launch (opt-in in settings).
- **Data:** local files only. No background sync. No crash-reporting that sends anything off the machine without explicit opt-in.

## Stack (locked by the team's conventions)

- `stack: rust-tauri+ts-react`
- Shell: Tauri 2.x
- Backend: Rust (stable, edition 2021), Tokio async runtime
- Frontend: React 18, Vite, TypeScript (strict)
- Editor: Monaco (`@monaco-editor/react`) with YAML support (`monaco-yaml`) for schema validation
- API view: `swagger-ui-react`, `supportedSubmitMethods: []` (no "Try it out" button)
- Terminal: `xterm.js` + `@xterm/addon-fit` on the frontend, `portable-pty` on the Rust side
- YAML parsing (with line numbers for cross-pane navigation): `yaml` (eemeli/yaml) on the frontend for AST + range info; `serde_yaml` on Rust for authoritative parse during validation and reader generation
- Tests: `cargo test` (Rust) + Vitest + React Testing Library (frontend)
- Packaging: MSI + NSIS via `cargo tauri build`

## Mode

- `mode: greenfield`

## Taxonomy / ingredient model
Not applicable (no CRUD domain).

## Increments

### Increment 1 — "A working split view"

Deliverables:
- Tauri shell launches on Windows, displays a split pane: Monaco left, `swagger-ui-react` right.
- File menu: Open, Save, Save As, Recent (last 5), Close. Native dialogs via `plugin-dialog`.
- Monaco loads a YAML or JSON OpenAPI 3.0/3.1 file. Language auto-detected from file extension; user override in a status-bar dropdown.
- Debounced parse (200ms) updates the Swagger view; parse errors keep the last-good view and show an inline toast.
- Schema validation on by default (fetch 3.1 schema once, cache in `app_data_dir`). Red squiggles in Monaco.
- Save writes the file to disk (encoding: UTF-8, LF line endings by default; preserve what the file originally had when known).
- No reader file yet, no terminal yet, no jump-to-line yet — those arrive in Increments 2 and 3.
- Smoke-test performance: open the Petstore 3.1 spec (~250 lines) in < 200ms on the target hardware.

**Acceptance (manual):**
- A colleague opens a 10,000-line spec; the UI remains responsive while Monaco finishes highlighting.
- Typing a syntax error into the YAML shows a red squiggle within 300ms; fixing it clears the squiggle.
- Saving and reopening the file produces a byte-identical output when no edits were made.

### Increment 2 — "The reader file and the copy-context command"

Deliverables:
- On every save, Rust generates `<spec-name>.reader.md` next to the spec. Contents:
  - Front matter with spec title, version, source path.
  - Table of contents: all paths grouped by first-level tag, each operation with its summary and line number.
  - Schemas section: every component schema with its name, "used by" list, and line number.
  - Security schemes section: list each scheme with its type and line number.
  - Tags section with description.
  - Validation warnings section: each violation with its location.
- `Copy context for Claude` command (Ctrl+Shift+Y): puts a Markdown block on the clipboard with the spec path, the reader file path, the current cursor line, and the current selection.
- Clicking an operation in the Swagger view scrolls Monaco to that operation's definition line.
- Keyboard shortcut and menu entry for the above.

**Acceptance (manual):**
- Open a non-trivial spec, hit Save. A `<name>.reader.md` appears next to it and matches the spec's structure.
- Hit Ctrl+Shift+Y. Paste into a Claude Code session; Claude can locate operations by line number.

### Increment 3 — "Embedded terminal"

Deliverables:
- Terminal pane (collapsible, docked to the bottom or right — operator picks at design-review).
- New Terminal (Ctrl+`) opens a tab with the current spec's folder as cwd.
- Shell is `pwsh.exe` on Windows by default; user-overridable in Settings.
- Env vars `OPENAPI_FILE`, `READER_FILE`, `APP_CURRENT_LINE` are set on spawn and updated on save / cursor move (debounced, 500ms).
- Terminal resizes with the pane (debounced, 150ms).
- Scrollback cap: 10,000 lines.
- Font family and size follow OS defaults with user override.
- Closing a tab kills the child cleanly (no zombies).
- Multiple terminal tabs supported.

**Acceptance (manual):**
- Open the editor, then open a terminal tab. Type `echo %OPENAPI_FILE%` — shows the currently-open spec path.
- Launch Claude Code in that terminal. Claude can read the spec and the reader file without the user typing any path.
- Close the app. Task Manager shows no orphaned `pwsh.exe` or `claude` child processes.

## Compliance notes

- GDPR: this app does not collect or process personal data. No accounts, no telemetry, no analytics.
- The only outbound network call is the (opt-out) schema fetch for Monaco validation; this is a request to a public URL (`https://spec.openapis.org/...`) and the response is cached locally.
- No privacy policy page required in-app (purely local tool).

## Open questions for the review board

(None at brief time — the operator has answered all scope and stack decisions.)

## Operator

- Name: Leo
- GitHub repo: https://github.com/BIoodHound/apicoord
- Timezone: Atlantic/Canary
- Approvals happen in the terminal with `approve` / `reject --notes "..."`.
- Dashboard LAN-access: `python -m orchestrator dashboard --lan`.


# Architecture

# APICoord — Architecture

> Owned by the architect. Everyone else reads it to know where things go.
> State: **Increment 1 (M1) — "a working split view" — BUILD, first task applied (2026-11-24).**
> Specs `design/specs/m1-*.md` (operator-approved), council decision `design/council/m1/decision.md`,
> operator answers Q1–Q7 folded into §13. §5 is the **authoritative IPC contract**. `design/ipc-contract.md`
> must be replaced with §5 verbatim (the ownership hook blocks the architect, see B2).
> Note on vocabulary: this is a Tauri desktop app, not a game. "Scene tree" = React component tree (§3),
> "autoloads" = app-lifetime singletons (§4), "gameplay ↔ UI signals" = Rust ↔ webview commands/events (§5),
> "physics layers" = trust boundaries (§8), "input actions" = shortcuts (§7).

---

## 0. Pipeline blockers — fix before T0 (operator / orchestrator)

These are outside every agent's lane, and each one blocks T0.

| # | Problem (verified 2026-11-24) | Fix |
|---|---|---|
| B1 | The configured test gate is `cd backend && mvn -q test` / `cd frontend && npm test`. **Neither directory exists**; the gate fails on `cd`. Cause: `PIPELINE_STACK` defaults to `java-spring+ts-react` (`orchestrator/runner_adapter.py`). | Run apicoord with `PIPELINE_STACK=rust-tauri+ts-react`. That adapter already exists and runs `cd src-tauri && cargo test` + `npm test -- --run` at the project root, with task tests at `src-tauri` test names `task_<id>` and `src/__tests__/tasks/task_<id>/`. |
| B2 | The file-ownership hook uses the Spring lane map (`backend/pom.xml`, `frontend/package.json`, `api-contract.md`). In this repo the architect can't write `package.json`, `tsconfig.json`, `vite.config.ts`, `src-tauri/Cargo.toml`, `tauri.conf.json`, `capabilities/*`, `src-tauri/src/lib.rs` or `design/ipc-contract.md`, although §2 assigns them to the architect. | Re-map the architect lane for the tauri stack (the §2 table). Until then, **this document is the authoritative IPC contract (§5)**, and T0's owner applies the config deltas in §9 verbatim. |
| B3 | The gate host (Raspberry Pi, linux-arm64) has **no `cargo`** and no `webkit2gtk-4.1`. Any `cargo test` that builds the `tauri` crate fails on this host. | Install rustup + Tauri's Linux prerequisites (`libwebkit2gtk-4.1-dev`, `libsoup-3.0-dev`, `libjavascriptcoregtk-4.1-dev`, `librsvg2-dev`, `build-essential`, `pkg-config`). Independently, §2 puts all logic in a tauri-free crate, `apicoord-core`, so `cargo test -p apicoord-core` works on any host with only rustup. |

| B4 | `node_modules/` is absent, so `npm test -- --run` fails with `vitest: not found`. The architect may not run `npm install`. | T0 (per m1-foundation, "a build with the pinned deps succeeds") runs `npm install` after applying §9.1 and commits `package-lock.json`. |

Gate result, re-run 2026-11-24 by the architect: `cd backend && mvn -q test` → `cd: backend: No such file or directory`;
`npm test -- --run` → `vitest: not found` (B4); `cargo` is not installed (B3). **Nothing ran. The gate is red for environmental reasons, not code.**
The only existing tests are `src/__tests__/App.test.tsx` (1 test) and `commands/health.rs::ping_returns_ok`.

**Correct gate for this repo** (m1-foundation T0), run from `projects/apicoord/`:
```
cargo test --manifest-path src-tauri/Cargo.toml      # runs app + apicoord-core (workspace default-members)
npm test -- --run && npm run typecheck
```

---

## 1. System shape

One process, one window (label `main`). Rust owns **every byte on disk**: open, save, recent list and schemas. It also owns the native menu and the path allow-list. The webview owns the **text buffer and everything derived from it**: Monaco, parse worker, swagger preview, validation markers, dirty state and the prompts.

```
┌──────────────────────── Webview (React 18, strict CSP, no fs/http) ────────────────────────┐
│  Monaco (+monaco-yaml / json)  ──onChange──► parse.worker (yaml→JSON, hash) ──► store ──► SwaggerUI │
│        ▲ markers                                                                 │         │
│        └──────────── schema text (inline) ◄── get_schema ──┐                     ▼         │
│  fileActions dispatcher ◄── menu://action  ◄───────────────┼──── StatusBar / Title / Prompt │
└───────────────────────────────┬─────────────────────────────┼──────────────────────────────┘
                     invoke(cmd)│                             │ events
┌───────────────────────────────▼─────────────────────────────┴──────────────────────────────┐
│ app crate (src-tauri): commands/*, menu.rs, Session state, dialogs (tauri-plugin-dialog, Rust API) │
│ apicoord-core (src-tauri/core): textcodec, eol, mru, paths, atomic write, schemas, version sniff     │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

There is no network code anywhere. Schemas, Monaco, workers and swagger are all bundled.

## 2. Modules & ownership

| Area | Owner | Location |
|---|---|---|
| Tauri entry, plugin wiring, managed state, command registry | architect | `src-tauri/src/lib.rs` |
| Tauri config, CSP, capabilities | architect | `src-tauri/tauri.conf.json`, `src-tauri/capabilities/*.json` |
| Cargo / npm deps, Vite, tsconfig | architect | `src-tauri/Cargo.toml`, `src-tauri/core/Cargo.toml`, `package.json`, `vite.config.ts`, `tsconfig.json` |
| **Pure logic crate (no tauri dep)** | rust-dev | `src-tauri/core/src/{textcodec,eol,doc,mru,paths,fsx,schemas,sniff}.rs` |
| Boundary types + error enum (shape fixed by §5) | architect (shape) / rust-dev (impl) | `src-tauri/core/src/{models,error}.rs`; `src-tauri/src/error.rs` re-exports |
| Bundled schemas | rust-dev (copy verbatim, §9.5) | `src-tauri/core/schemas/oas-3.0.json`, `oas-3.1.json` |
| IPC commands (thin: lock state, call core, show dialogs, emit) | rust-dev | `src-tauri/src/commands/{file,recent,schema,app,health}.rs` (`app.rs` = `exit_app`) |
| Session state struct | rust-dev (shape fixed by §4) | `src-tauri/src/state.rs` |
| Native menu | rust-dev | `src-tauri/src/menu.rs` |
| IPC wrappers + TS boundary types | frontend-dev | `src/ipc/{types,file,recent,schema,app,events}.ts` |
| Store | frontend-dev | `src/state/store.ts` |
| Editor | frontend-dev | `src/features/editor/` |
| Preview + parse worker | frontend-dev | `src/features/preview/` |
| Validation binding | frontend-dev | `src/features/validation/` |
| File actions, dirty guard, prompt | frontend-dev | `src/features/file/` |
| Layout, status bar | frontend-dev | `src/components/` |
| Perf marks (names fixed by §6.3) | frontend-dev (emit) / QA (harness) | `src/perf/marks.ts`, harness under `src/__tests__/` + `scripts/perf/` |
| Fixtures + fixture generator | qa-engineer | `tests/fixtures/`, `tests/fixtures/gen-big-10k.mjs` |
| Rust tests | qa-engineer | `src-tauri/core/tests/task_<id>_*.rs`, `src-tauri/tests/task_<id>_*.rs` |
| Frontend tests | qa-engineer | `src/__tests__/tasks/task_<id>/` |
| Packaging / CI | packaging-engineer | `packaging/`, `.github/workflows/` (no Windows CI this increment, Q2) |

Why there is a core crate: `cargo test -p apicoord-core` needs no webkit and runs in about a second, and every acceptance check for round-trip, MRU or allow-list is a pure function test. The app crate stays thin, so it has nothing much to test that needs a window.

## 3. Component tree ("scene tree")

```
<StrictMode>
 <App>                               mounts once; wires bootstrap effects (§4)
  ├─ <SplitPane default=50/50 draggable>
  │   ├─ <EditorPane>                React.lazy → loads Monaco chunk; shows "Loading editor…" until ready
  │   │    └─ <MonacoEditor>         one model per open document; never recreated on language switch
  │   └─ <PreviewPane>               React.lazy → loads swagger-ui-react chunk
  │        ├─ <StaleBadge>           previewStatus.kind === 'stale' → "Preview is out of date — line N: msg"
  │        ├─ <EmptyInvalid>         previewStatus.kind === 'empty-invalid' → "Fix the syntax error to see a preview"
  │        ├─ <EmptyNoDoc>           no document
  │        └─ <SwaggerView spec>     memo; receives only objects; supportedSubmitMethods=[]; docExpansion="list"
  ├─ <StatusBar>   [Language ▾][UTF-8 BOM][CRLF][preview status][3 problems][Ln 4, Col 12][notice]
  └─ <DirtyPrompt> in-webview modal: Save / Don't Save / Cancel (resolves a Promise)
```

Rules:
- The swagger tree is never unmounted on a parse error. "Keep last good" means the `spec` in the store simply doesn't change.
- Neither `EditorPane` nor `PreviewPane` is in the initial bundle (spec: lazy). The worker is created on first document open.
- The three-way prompt is a **webview modal, not a native dialog**: `plugin-dialog`'s message dialog has no reliable 3-button variant, a webview modal needs no capability, and jsdom can test it.

## 4. Singletons ("autoloads")

| Singleton | Side | Lifetime | Responsibility |
|---|---|---|---|
| `SessionState = Mutex<Session>` | Rust managed state | app | `current: Option<CurrentDoc>` (path, **original bytes**, encoding, BOM, majority EOL, mixed flag) and `issued: HashSet<NormPath>` (allow-list). Recent entries are added to `issued` when loaded. |
| `MruStore` | Rust (inside `Session`, persisted by core `mru.rs`) | app | ≤5 entries; loaded from `app_data_dir/recent.json` in `setup()`; corrupt → empty. |
| `SchemaStore` | Rust core `schemas.rs` | app | `setup()` copies the bundled schemas to `app_data_dir/schemas/` if missing. `get_schema` reads the copy, JSON-parses it, and on failure returns the bundled text and rewrites the copy. Bundled = `include_str!` (compiled in, so no resource-path resolution). |
| `useStore` (Zustand) | frontend | app | The only UI state; shape in §6.1. The store also acts as the event bus, so there is no separate emitter. |
| `monacoSetup.ts` | frontend | first editor load | Sets `self.MonacoEnvironment.getWorker`, calls `loader.config({ monaco })` (**required**, otherwise `@monaco-editor/react` pulls from jsDelivr), and runs `configureMonacoYaml(monaco, { enableSchemaRequest: false, validate: true, schemas: [] })` once. |
| `parseClient.ts` | frontend | first doc open | Owns the single `parse.worker` instance, the `seq` counter and stale-reply drop. |
| `fileActions.ts` | frontend | app | **The single dispatcher** for `open / save / saveAs / close / recent / exit / windowClose`. Every input source (§7) calls it, and only it calls the file IPC. It contains `confirmDiscardIfDirty()`. |

Bootstrap order in `App` (one effect): `listen('menu://action')` → `listen('recent://changed')` → `getCurrentWindow().onCloseRequested(...)` → `list_recent()`. Each listener must be unlistened in cleanup, because StrictMode double-mounts.

## 5. Rust ↔ UI contract (commands, events, types) — authoritative

`design/ipc-contract.md` must mirror this section (blocked by B2).

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

## 6. Frontend internals

### 6.1 Store shape (`src/state/store.ts`)

```ts
type Language = 'yaml' | 'json'
type PreviewStatus =
  | { kind: 'none' }                                   // no document
  | { kind: 'ok' }
  | { kind: 'stale'; line: number; message: string }   // last-good kept
  | { kind: 'empty-invalid'; line: number; message: string }
interface DocumentSlice {
  doc: null | { path: string; fileName: string; encoding: TextEncoding; hasBom: boolean; eol: Eol;
                mixedEol: boolean; openapiVersion: OpenApiVersion | null }
  language: Language; languageOverridden: boolean      // session-only (Q5)
  savedVersionId: number; dirty: boolean
}
interface PreviewSlice { previewStatus: PreviewStatus; spec: object | null; specHash: string | null; lastSeq: number }
interface ValidationSlice { markerCount: number }
interface UiSlice { recent: RecentEntry[]; notice: string | null; cursor: { line: number; col: number } }
```
`previewStatus` is the **only** source for preview UI and for tests (rule 2). The buffer text is **not** in the store, because Monaco owns it. That avoids a 400 KB string copy per keystroke.

### 6.2 Keystroke → preview pipeline

1. Monaco `onDidChangeModelContent` → `mark('ks')` → update `dirty = model.getAlternativeVersionId() !== savedVersionId` (this also clears dirty when undo returns to the saved text) → restart the 200ms debounce.
2. Debounce fires → `seq++` → `worker.postMessage({ seq, text: model.getValue(), language })`.
3. Worker (`parse.worker.ts`, uses the `yaml` package for both YAML and JSON because JSON is YAML 1.2): `parseDocument(text, { prettyErrors: true })`. Errors, or a root that isn't a plain object, give `{ seq, ok: false, line, message }`. Otherwise `json = doc.toJS({ maxAliasCount: 100 })`, `hash = fnv1a64(JSON.stringify(json))`, reply `{ seq, ok: true, hash, json }`.
4. Main thread: if `seq < lastShownSeq`, drop the reply (rule 3). If ok and `hash === specHash`, set `previewStatus=ok` and **don't** call `setSpec` (rule 4). If ok and the hash changed, set `spec` and then `mark('commit')` in `SwaggerView`'s `useLayoutEffect` after the commit. If not ok, use `stale` when `spec` is set, otherwise `empty-invalid`, and set a Monaco marker with owner `apicoord-parse` at `line`.
5. On a language override or a new document, the parse runs immediately with no debounce.

The worker stays only if the harness says it pays off; research flagged structured-clone cost as unmeasured. Swapping it for in-thread parsing changes only `parseClient.ts`, because the protocol is identical.

### 6.3 Perf marks (contract for QA's harness)

`performance.mark('apicoord:ks')` on every content change, and `performance.mark('apicoord:commit', { detail: { seq } })` on swagger commit. Latency = commit time − time of the **last** `ks` before the debounce fired that produced `seq`. Harness output: p50/p95 for Petstore and big-10k separately. It is measured from a `tauri build` release binary on the Windows target (gate-review follow-up). **A miss holds the increment (Q3).** There is no line-count debounce fallback; that idea from the spec's tuning section is void.

Budget: 200ms debounce + ≤50ms for postMessage, parse, clone, hash and swagger render. Petstore parse+render should be well inside that. For big-10k, the harness runs in T0b, **before** feature work, so a miss is known on day 1 and can be redesigned rather than degraded.

### 6.4 Validation binding

- `jsonSchemaFor(version)` = `JSON.parse(await get_schema(version ?? '3.1'))`, cached.
- YAML: `monacoYaml.update({ enableSchemaRequest: false, validate: true, schemas: [{ uri: 'apicoord://schemas/oas-<v>.json', fileMatch: [model.uri.toString()], schema }] })`.
- JSON: `monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ validate: true, enableSchemaRequest: false, schemas: [same] })`.
- The model URI is `file:///doc-<n>.<yaml|json>`, with a fresh `n` per opened document. A **language override does not change the URI**. It calls `monaco.editor.setModelLanguage(model, lang)` then rebinds the schema for the new language and triggers the immediate re-parse, all in one function (`applyLanguage`, rule 5).
- Marker count = `monaco.editor.getModelMarkers({ resource: model.uri }).length` (all owners, including `apicoord-parse`), updated on `onDidChangeMarkers`.

### 6.5 Open / save sequence (frontend)

- **open:** `confirmDiscardIfDirty()` → `open_spec_dialog()` → if not null: dispose the old model and create a new one with `text` → `model.setEOL(eol === 'crlf' ? CRLF : LF)` (Monaco now holds the majority EOL) → language from the extension table (spec m1-editor), override reset (Q5) → `savedVersionId = model.getAlternativeVersionId()` → immediate parse → schema bind.
- **save:** `save_spec({ text: model.getValue(), clean: !dirty })` → `savedVersionId = current altVersionId`; if `eolNormalised`, show the note "Mixed line endings: saved as CRLF" (Q6). On error the buffer stays dirty and the status bar shows the message.
- **saveAs:** same, with `save_spec_as`; on non-null, update `doc.path/fileName` and the title; **keep the override** (Q5).
- **confirmDiscardIfDirty()** → `true` when clean; otherwise opens `DirtyPrompt`. Save → run save, return its success (false on cancel or failure). Don't Save → true. Cancel → false.
- **windowClose:** `onCloseRequested(e => { e.preventDefault(); if (await confirmDiscardIfDirty()) await getCurrentWindow().destroy() })`. **Exit** goes through the same guard, then `exit_app`.
- Title: `${dirty ? '• ' : ''}${fileName} — APICoord`, or `APICoord` when there's no document, via `getCurrentWindow().setTitle`.

## 7. Input actions (shortcuts) — one owner each

| Action | Keys | Owner | Calls |
|---|---|---|---|
| Open | Ctrl+O | **TBD by spike (a)** | `fileActions.open()` |
| Save | Ctrl+S | **TBD by spike (a)** | `fileActions.save()` |
| Save As | Ctrl+Shift+S | **TBD by spike (a)** | `fileActions.saveAs()` |
| Close | Ctrl+W | **TBD by spike (a)** | `fileActions.close()` |
| Exit | Alt+F4 / menu | OS → `onCloseRequested` / menu item | `fileActions.exit()` |
| Undo/redo, find, etc. | Monaco defaults | Monaco | — |

Spike (a) outcome rule, applied to all four together:
- **Menu accelerator fires while Monaco has focus:** the native menu items carry the accelerators and Monaco binds nothing.
- **It doesn't fire:** the menu items have **no accelerator**, and their labels show the shortcut text (for example `Save\tCtrl+S`). `editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, ...)` is the sole binding. A `window` keydown listener also covers the case where focus is outside Monaco, but only when `!editor.hasTextFocus()`, which keeps a single owner per key event.

Either way, the menu event and the Monaco command land in the same `fileActions` function. QA asserts that one keypress → one `save_spec`.

## 8. Trust boundaries ("layers")

There is no physics in this app. The layers that matter are trust boundaries.

| Layer | Can | Cannot |
|---|---|---|
| Webview JS (incl. swagger-rendered Markdown from foreign specs) | `invoke` the commands in §5.1, listen to the §5.2 events, set its own title, destroy its own window | read/write files, fetch over the network (CSP `connect-src` is IPC only), open native dialogs, pass arbitrary paths |
| Rust command layer | read/write paths in `issued` only, show dialogs, write `app_data_dir` | (no network crates in the dependency tree) |
| Disk | — | — |

CSP and capabilities are in §9.3–9.4. swagger-ui gets `supportedSubmitMethods: []`, and the CSP is the second layer that blocks outbound requests.

## 9. Config deltas (T0 owner applies these verbatim; blocked for the architect by B2)

### 9.1 `package.json`
- **Remove:** `@tauri-apps/plugin-fs` (rule 10) and `@tauri-apps/plugin-dialog` (dialogs are Rust-side; the prompt is a webview modal).
- **Add deps:** `@monaco-editor/react ~4.7.0`, `monaco-editor ~0.54.0` (**not 0.58**: monaco-yaml 5.5.1 is tested against `^0.54.0`, and 0.58 shipped 2026-11-23), `monaco-yaml ~5.5.1`, `swagger-ui-react ~5.36.0`, `yaml ^2.9.1` (already a monaco-yaml dep, used directly in the worker), `zustand ^5.0.0`.
- **Pin:** `react`/`react-dom` `~18.3.1`. swagger-ui-react 5.36 peer range is `>=16.8 <20`, so React 19 would also satisfy it, but we stay on the 18 line to avoid StrictMode warnings in swagger; T0's build confirms. **Working range recorded: react 18.3.x with swagger-ui-react 5.36.x.**
- **Add devDeps:** `@types/swagger-ui-react ~5.18.0`.
- **Add script:** `"typecheck": "tsc -b"`. Rename `name` to `apicoord`.
- **Commit `package-lock.json`.**

### 9.2 `vite.config.ts` / `tsconfig.json`
- vite: `worker: { format: 'es' }`, `build: { target: 'chrome105', sourcemap: false }`, and `test.exclude` adds `tests/fixtures/**`.
- tsconfig `types` adds `"vite/client"` (needed for `?worker` imports).
- Worker imports (verified to exist in the pinned packages): `monaco-editor/esm/vs/editor/editor.worker?worker`, `monaco-editor/esm/vs/language/json/json.worker?worker`, `monaco-yaml/yaml.worker?worker`, `./parse.worker?worker`.

### 9.3 `src-tauri/tauri.conf.json`
- Window: add `"label": "main"`.
- Replace `"csp": null` with:
```json
"csp": {
  "default-src": "'self'",
  "script-src": "'self'",
  "style-src": "'self' 'unsafe-inline'",
  "img-src": "'self' data:",
  "font-src": "'self' data:",
  "worker-src": "'self' blob:",
  "connect-src": "ipc: http://ipc.localhost",
  "object-src": "'none'",
  "frame-src": "'none'",
  "base-uri": "'none'",
  "form-action": "'none'"
},
"devCsp": {
  "default-src": "'self'",
  "script-src": "'self'",
  "style-src": "'self' 'unsafe-inline'",
  "img-src": "'self' data:",
  "font-src": "'self' data:",
  "worker-src": "'self' blob:",
  "connect-src": "ipc: http://ipc.localhost ws://localhost:1420",
  "object-src": "'none'"
}
```
`'unsafe-inline'` for styles only: both Monaco and swagger inject `<style>`/style attributes. Spike (c) confirms that nothing else is needed. If it turns out something is, the spike reports it and the architect decides; nobody loosens the CSP ad hoc.

### 9.4 Capabilities
- `capabilities/default.json` → `["core:default", "core:window:allow-set-title"]`. This removes `dialog:allow-open/save`, which narrows the file.
- New `capabilities/window-lifecycle.json` (`windows: ["main"]`, `permissions: ["core:window:allow-destroy"]`) for the close-requested flow.
- **No** `fs:*`, `http:*`, `shell:*` or `dialog:*` in any capability file. QA's test asserts this.

### 9.5 Rust crates
- `src-tauri/Cargo.toml`: remove `tauri-plugin-fs`; add `apicoord-core = { path = "core" }`; add
  `[workspace] members = ["core"]` and `default-members = [".", "core"]`, so a plain `cargo test` in `src-tauri` runs both. Keep `tauri-plugin-dialog`, which is used from Rust only. Add `tracing = "0.1"`.
- `src-tauri/core/Cargo.toml`: `name = "apicoord-core"`, `edition = "2021"`, deps `serde (derive)`, `serde_json`, `thiserror = "1"`; dev-dep `tempfile = "3"`. **No tauri, no network crates, no `encoding_rs`.**
- `lib.rs`: drop `tauri_plugin_fs::init()`. `.manage(Mutex::new(Session::default()))`. In `.setup(...)`: resolve `app_data_dir`, `schemas::ensure_copied`, `mru::load`, build the menu. Register the §5.1 commands. Add `.on_menu_event` → emit `menu://action`.
- Schemas: vendor verbatim into `src-tauri/core/schemas/` and load them with `include_str!`:
  - `oas-3.0.json` ← `https://spec.openapis.org/oas/3.0/schema/2021-09-28`, sha256 `7a0db7311a69d8b7f2505f59c5d4cbb58539a0961df0c05724a07538014822cf` (draft-04)
  - `oas-3.1.json` ← `https://spec.openapis.org/oas/3.1/schema/2022-10-07`, sha256 `da01ba28852cac0de53893797cb8d1942bc3b05084f526dcc216717dec314ed0` (2020-12; one `$dynamicRef: "#meta"`, no remote `$ref`s, verified)

  This is a one-time download at authoring time; the app makes no network calls at runtime. Record the hashes in a QA test.

## 10. Persistence (`app_data_dir`)

```
app_data_dir/
  recent.json            [{ "path": "...", "lastOpened": 1732460000000 }]  ≤5, atomic write, corrupt → []
  schemas/oas-3.0.json   copied from the binary on first run; restored on corruption
  schemas/oas-3.1.json
```
No settings file in M1. The language override is session-only (Q5).

## 11. Cross-cutting conventions

- snake_case in Rust and camelCase in TS. Boundary structs use `#[serde(rename_all = "camelCase")]`; enum value spellings are fixed by §5.3.
- No `unwrap()` outside `setup()`. Commands lock `Session` briefly and **never hold the lock across a dialog**.
- Logging: `tracing` in Rust, and only paths and error codes are logged, never file contents. The frontend logs through `console` with an `[apicoord:<area>]` prefix.
- The frontend never imports `@tauri-apps/plugin-fs` or `@tauri-apps/plugin-dialog`; this is grep-tested.
- No `any` in TS boundary types. The worker protocol types live in `src/features/preview/protocol.ts`.
- Capabilities only grow through new narrow files, and `default.json` never widens.
- Windows conventions for shortcuts and dialogs.

## 12. Core skeletons — T0 creates these verbatim (architect blocked by B2)

They are kept to the files whose shape is a cross-lane contract. Bodies are `todo!()` or `throw`, and feature tasks fill them in.
Together with §5.3 (`core/src/error.rs`, `src/ipc/types.ts`) and §6.1 (store types), this is the full skeleton set.

**`src-tauri/src/state.rs`**
```rust
use std::{collections::HashSet, sync::Mutex};
use apicoord_core::{models::{Eol, TextEncoding, RecentEntry}, paths::NormPath};

pub struct CurrentDoc {
    pub path: std::path::PathBuf,
    pub original_bytes: Vec<u8>,
    pub encoding: TextEncoding,
    pub has_bom: bool,
    pub eol: Eol,
    pub mixed_eol: bool,
}
#[derive(Default)]
pub struct Session {
    pub current: Option<CurrentDoc>,
    pub issued: HashSet<NormPath>,
    pub recent: Vec<RecentEntry>,      // ≤5, newest first; persisted by core::mru
    pub app_data_dir: std::path::PathBuf,
}
pub type SessionState = Mutex<Session>;
```

**`src-tauri/src/lib.rs`** (wiring only)
```rust
mod commands; mod error; mod menu; mod state;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(state::Session::default()))
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            apicoord_core::schemas::ensure_copied(&dir)?;
            let recent = apicoord_core::mru::load(&dir);             // corrupt → empty
            { let s = app.state::<state::SessionState>(); let mut s = s.lock().unwrap();
              s.app_data_dir = dir; s.recent = recent; /* + seed `issued` from recent */ }
            menu::install(app.handle())?;                            // builds File menu + Recent submenu
            Ok(())
        })
        .on_menu_event(|app, ev| { if let Some(e) = menu::to_event(ev.id().as_ref(), app) { let _ = app.emit("menu://action", e); } })
        .invoke_handler(tauri::generate_handler![
            commands::health::ping,
            commands::file::open_spec_dialog, commands::file::open_recent,
            commands::file::save_spec, commands::file::save_spec_as, commands::file::close_document,
            commands::recent::list_recent, commands::schema::get_schema, commands::app::exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**`src-tauri/core/src/lib.rs`**: `pub mod {error, models, textcodec, eol, doc, mru, paths, fsx, schemas, sniff};`. These are pure functions with no tauri dependency.
`models.rs` holds `TextEncoding` (`#[serde(rename = "utf-8")]` etc.), `Eol` (`lowercase`), `OpenedSpec`, `SaveResult`, `RecentEntry`, `MenuEvent`, all camelCase.

**`src/features/file/fileActions.ts`**: the single dispatcher (§4, §7)
```ts
export interface FileActions {
  open(): Promise<void>; openRecent(path: string): Promise<void>
  save(): Promise<boolean>; saveAs(): Promise<boolean>
  close(): Promise<void>; exit(): Promise<void>; windowClose(): Promise<void>
  confirmDiscardIfDirty(): Promise<boolean>
}
export const fileActions: FileActions
```

**`src/features/preview/protocol.ts`**: worker messages
```ts
export interface ParseRequest { seq: number; text: string; language: 'yaml' | 'json' }
export type ParseReply =
  | { seq: number; ok: true; hash: string; json: Record<string, unknown> }
  | { seq: number; ok: false; line: number; message: string }
```

**`src/perf/marks.ts`**
```ts
export const markKeystroke = () => performance.mark('apicoord:ks')
export const markCommit = (seq: number) => performance.mark('apicoord:commit', { detail: { seq } })
```

There is no separate event bus. Rust → webview signalling is the two Tauri events in §5.2, and inside the webview the Zustand store is the bus (§4).
Adding an emitter library would give state two homes.

## 13. Decisions log

| # | Decision | Source | Date |
|---|---|---|---|
| D1 | Rust owns all disk IO; `plugin-fs` removed; the only command taking a path is `open_recent`, which is allow-list-checked | council #2, #10 | 2026-11-24 |
| D2 | Both OAS schemas are bundled with `include_str!` and copied to `app_data_dir/schemas`. There is no fetch and no network crate | council #3, operator Q1 | 2026-11-24 |
| D3 | p95 <250ms is a hard gate for Petstore **and** big-10k; the line-count debounce fallback is removed, and a miss holds the increment | operator Q3 | 2026-11-24 |
| D4 | A clean save or Save As writes the original bytes; an edited save writes the majority EOL with the original encoding and BOM | council #2, Q4, Q6 | 2026-11-24 |
| D5 | The language override is session-only, survives Save As, resets on open; it uses `setModelLanguage`, and the model URI stays fixed | council #9, Q5 | 2026-11-24 |
| D6 | Encoding, BOM and EOL are shown in the status bar | Q7 | 2026-11-24 |
| D7 | Pure logic goes in the `apicoord-core` crate with no tauri dependency, so the tests run without webkit | architect (B3) | 2026-11-24 |
| D8 | The three-way dirty prompt is a webview modal, not a native dialog, so the webview gets no dialog capability | architect | 2026-11-24 |
| D9 | The native menu only emits `menu://action`, and the webview's `fileActions` is the single dispatcher. Exit is a custom item, not predefined quit | council #6, #7, #8 | 2026-11-24 |
| D10 | Shortcut ownership depends on spike (a), with one owner per key and no de-duplication layer | council #6 | 2026-11-24 |
| D11 | State is Zustand; the buffer text lives in Monaco only, not the store | architect | 2026-11-24 |
| D12 | The worker parses with `yaml` for both languages, and a hash skip avoids redundant `setSpec` calls; the harness decides whether the worker stays | council #4 | 2026-11-24 |
| D13 | `monaco-editor ~0.54.0` (monaco-yaml's tested line), React 18.3.x, swagger-ui-react 5.36.x | architect, T0 verifies | 2026-11-24 |
| D14 | IPC errors are objects `{code, message}` with snake_case codes, and `OpenedSpec.majorityEol` is folded into `eol` | architect | 2026-11-24 |
| D15 | Strict CSP: `connect-src` is IPC only and `'unsafe-inline'` is allowed for styles only; spike (c) validates it | council #10 | 2026-11-24 |
| D16 | §5 is the authoritative IPC contract until `ipc-contract.md` is replaced with §5 verbatim; `exit_app` lives in `commands/app.rs` | operator procedural note; B2 | 2026-11-24 |
| D17 | No event-bus library: Tauri events cross the process boundary, and the Zustand store is the in-webview bus. The skeleton set is §12 | architect | 2026-11-24 |
| D18 | The test gate is cargo (`src-tauri` workspace) + vitest + `tsc -b` from the project root; the mvn/backend gate is wrong for this repo | foundation T0; B1 | 2026-11-24 |


# Spec: m1-editor.md

# M1 — Editor pane and status bar

**Research:** `monaco-in-tauri.md`, `text-file-roundtrip.md`. **Decision:** council m1 #9, #11, rule 5. **Departure:** `monaco-in-tauri.md` suggests `vite-plugin-monaco-editor-esm` and `enableSchemaRequest`; the council rejected both (barely maintained / needs HTTP). We use `?worker` imports and local `monaco-editor`.

## Goal
A fast Monaco editor with correct language mode, offline, and a status bar that tells the truth about the document.

## User-visible behaviour
- Left pane is Monaco (lazy-loaded; a "loading editor…" placeholder shows until ready). Right pane is the preview. Draggable splitter, default 50/50.
- Language: `.yaml`/`.yml` → YAML, `.json` → JSON. Any other extension: first non-blank character `{` → JSON, else YAML.
- Status bar (left→right): language dropdown (YAML/JSON), encoding (+BOM), EOL, preview status (`m1-preview`), marker count ("3 problems"), cursor `Ln, Col`.
- Language override is **session-only**, does not change saved bytes, survives Save As, and resets when another file is opened. Switching it re-runs parse and schema binding in one step without recreating the model (undo history and markers are kept).
- Dirty marker appears on first edit and clears on save or when text returns to the saved text.
- Theme follows system light/dark.

## API shape
None (frontend only; consumes `OpenedSpec`).

## Data
Store `document` slice; no persistence.

## Acceptance criteria
- Monaco loads with no network (test with network blocked; no jsDelivr request).
- Workers load in both `tauri dev` and the packaged build: syntax highlighting works and a schema squiggle appears.
- Extension detection table above passes, including an extensionless file starting with `{` (JSON) and one starting with `openapi:` (YAML).
- Override YAML→JSON on a YAML buffer changes the mode and triggers exactly one re-parse; model identity and undo stack are preserved.
- Opening `big-10k.yaml`: UI stays responsive (a typed key echoes within 100ms while highlighting finishes) — manual on Windows.
- Open Petstore 3.1 → editor text visible in <200ms from file chosen (manual on Windows, recorded).
- Status bar shows correct encoding/EOL for each fixture.

## Non-goals
Persisted override; settings UI; minimap/theme options; jump-to-line from preview (Increment 2); find in preview.

## Open questions for the operator
None new.


# Spec: m1-file-io.md

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


# Spec: m1-foundation.md

# M1 — Foundation: test gate, fixtures, harness, shell hardening

**Research:** `tauri-capabilities.md`, `monaco-in-tauri.md`, `swagger-ui-react-embed.md`. **Decision:** council m1 #1, #10, #11, rule 15.

## Goal
Make a green test run mean something and give every later task fixtures, a timing harness and a locked-down shell to build on.

## User-visible behaviour
The app launches on Windows into an empty split window (editor left, preview right, status bar bottom). Nothing else is visible yet.

## API shape
None new. `ping` stays. Capabilities and CSP per `architecture.md`.

## Data
Fixtures under `tests/fixtures/`:
- `petstore-3.0.yaml`, `petstore-3.1.yaml`
- `big-10k.yaml` (generated, ≥10,000 lines, valid 3.1; generator script committed)
- EOL/encoding: `eol-lf.yaml`, `eol-crlf.yaml`, `eol-mixed.yaml` (majority CRLF), `utf8-bom.yaml`, `utf16le.yaml`, `no-final-newline.yaml`
- `non-object.yaml` (a bare list), `invalid-on-open.yaml` (syntax error), `schema-invalid.yaml` (parses, violates schema), `legacy-latin1.yaml`

## Acceptance criteria
- T0: `cargo test --manifest-path src-tauri/Cargo.toml` and `npm test -- --run` run from the project root, and CI/orchestrator config points at them; each runs ≥1 real test.
- T0: a build with the pinned `react`/`react-dom` and `swagger-ui-react` succeeds; the working version range is recorded in `architecture.md`.
- T0: `plugin-fs` is absent from `Cargo.toml`, `package.json` and capabilities; `tauri.conf.json` has a strict CSP (no `csp: null`) and the webview has no `http:*`/`fs:*` permission.
- T0b: all fixtures above exist and a test asserts their key properties (e.g. `eol-mixed` has both `\r\n` and lone `\n`; `big-10k` ≥10,000 lines).
- T0b: a timing harness records `ks`→`commit` marks and prints p50/p95 for Petstore and `big-10k` separately.
- Spikes (written up in the task result, ≤10 lines each): (a) does a native-menu accelerator for Ctrl+S fire while Monaco has focus in WebView2; (b) does 3.1 `$dynamicRef` produce squiggles in monaco-yaml on `schema-invalid.yaml`; (c) does the strict CSP break swagger-ui or Monaco.
- No feature task starts before T0 and T0b are done.

## Non-goals
Windows CI runner; perf gating in CI.

## Open questions for the operator
- Windows perf verification: manual run by QA (leaning) vs Windows CI runner (later).
- If `big-10k` misses 250ms p95: report and ship with a longer debounce above a line threshold (leaning) vs hold.


# Spec: m1-menu-lifecycle.md

# M1 — Native menu, Recent files, dirty-state guard

**Research:** `native-file-menu-recent-files.md`, `tauri-capabilities.md`, `tauri-ipc-patterns.md`. **Decision:** council m1 #6, #7, #8, rules 10, 11, 14.

## Goal
File menu with Open, Save, Save As, Recent (last 5) and Close, using native dialogs, and no way to lose unsaved edits by accident.

## User-visible behaviour
- Native **File** menu: Open… (Ctrl+O), Save (Ctrl+S), Save As… (Ctrl+Shift+S), Recent ▸ (up to 5, most recent first), Close (Ctrl+W), Exit.
- Save/Save As/Close are disabled when no document is open.
- Picking a Recent entry opens it. If the file is missing, it is removed from the list and a notice says "<name> no longer exists".
- If the buffer is dirty, Close, Open, Recent and closing the window all show Save / Don't Save / Cancel. Save then proceeds (and aborts the action if the save fails or is cancelled); Cancel aborts.
- The title bar shows `name — APICoord`, with `•` prefix when dirty.
- Ctrl+S has **one owner**: if spike (a) in `m1-foundation` shows the menu accelerator fires in Monaco, the menu owns it and Monaco binds nothing; otherwise Monaco's `addCommand` owns it and the menu shows "Ctrl+S" as a label only. Same rule for Ctrl+O/W/Shift+S.

## API shape
- `list_recent() -> RecentEntry[]`; event `recent://changed`; event `menu://action {id}`.
- All opening/saving goes through `m1-file-io` commands. Window close uses `onCloseRequested` → `confirmDiscardIfDirty()`.

## Data
`app_data_dir/recent.json`: array of ≤5 `{path, lastOpened}`; normalised paths (case-fold, strip `\\?\`, UNC) before de-dup; move-to-front; write atomically; corrupt file → empty list.

## Acceptance criteria
- Open, Save, Save As, Recent, Close each work from the menu; Save As updates path and Recent.
- Recent holds exactly 5 after 6 distinct opens; opening `C:\a.yaml` then `c:\A.YAML` yields one entry.
- Recent survives an app restart and entries reopen successfully (via Rust command, not fs scope).
- Missing Recent file is removed and a notice shown.
- A single Ctrl+S press causes exactly one `save_spec` call (QA test).
- With a dirty buffer, each of Close / Open / Recent / window-close shows the three-way prompt; Cancel leaves the buffer and file unchanged; Don't Save discards; Save writes then proceeds.
- With a clean buffer none of them prompt.

## Non-goals
Pinned files; Clear Recent; autosave; multi-window; drag-and-drop open. **Cut order:** if scope slips, the native Recent submenu may fall back to an in-webview Recent list for M1 (council #8) — the behaviours above still apply.

## Open questions for the operator
None new (see `m1-file-io`, `m1-foundation`).


# Spec: m1-preview.md

# M1 — Live preview (parse + swagger-ui-react)

**Research:** `swagger-ui-react-embed.md`, `tauri-capabilities.md`. **Decision:** council m1 #4, #5, #10, rules 1–4, 13. **Departures:** the brief says parse errors show an inline toast; the council chose a persistent stale badge (a toast flashes at 200ms debounce and vanishes while the preview is still stale). The research brief's "render only the visible tag section" fallback is not built (no precedent; revisit only if the harness shows a miss).

## Goal
Show a live Swagger-style view of the spec that follows typing within budget and never goes blank or crashes mid-edit.

## User-visible behaviour
- 200ms after the last keystroke the buffer is parsed and the preview updates.
- Preview has no "Try it out" and no "Authorize" send ability; `supportedSubmitMethods: []`. `docExpansion: "list"`.
- **Parse error:** preview keeps the last good render and a badge on the preview pane reads "Preview is out of date — line 12: <message>" (persistent until fixed); Monaco shows a squiggle at the error. Fixing it clears the badge and updates the preview.
- **Non-object document** (empty, scalar, list) counts as a parse error.
- **Invalid on first open** (no last-good): the pane shows "Fix the syntax error to see a preview" plus the line/message.
- **Schema violations** never freeze or blank the preview; they only squiggle (`m1-validation`).
- A comment-only or whitespace-only edit does not re-render swagger.
- External `$ref`s are not resolved; swagger shows its usual unresolved-ref message.

## API shape
None. Worker protocol: in `{seq, text, language}`, out `{seq, ok:true, hash, json}` or `{seq, ok:false, line, message}`.

## Data
Store: `previewStatus: ok | stale{line,msg} | empty-invalid`, `spec`, `specHash`, `lastSeq`.

## Tuning numbers
Debounce 200ms; hash = fast non-crypto hash of `JSON.stringify(json)`; fallback (only if harness misses): debounce 400ms when buffer >5,000 lines.

## Acceptance criteria
- Valid edit to a summary appears in the preview within 250ms p95 of the last keystroke on Petstore (measured by harness marks; Windows manual run recorded).
- Same measurement is recorded separately for `big-10k.yaml`; a miss is reported, not hidden.
- `invalid-on-open.yaml`: `previewStatus = empty-invalid`, message with line shown, no swagger mounted.
- Typing a syntax error after a good render: `previewStatus = stale`, last render still in DOM, badge text has the line number; fixing it → `ok`.
- `non-object.yaml` → treated as parse error; swagger never receives a non-object (no crash).
- Out-of-order worker replies: a reply with `seq` older than the newest shown is discarded (unit test with delayed replies).
- Parsed hash unchanged → `setSpec` not called (unit test: comment-only edit).
- `schema-invalid.yaml` renders (`previewStatus = ok`) and has markers.
- "Try it out" button absent from the DOM; CSP blocks outbound requests from the webview.
- Swagger-ui and the worker load lazily (not in the initial bundle).

## Non-goals
Click-to-jump (Increment 2); virtualised/partial rendering; swagger "Models" tweaks beyond `defaultModelsExpandDepth` default; external ref resolution; a toast on errors.

## Open questions for the operator
- If `big-10k` misses 250ms p95: report and ship with the fallback (leaning) vs hold.
- Research flagged that worker structured-clone cost is unmeasured; the harness decides whether the worker stays.


# Spec: m1-validation.md

# M1 — Schema validation with bundled OpenAPI schemas

**Research:** `cached-remote-schema-offline.md`, `monaco-in-tauri.md`, `tauri-capabilities.md`. **Decision:** council m1 #3, rules 6, 7. **Departures (need operator sign-off):** the brief and the operator goal say "fetch 3.1 schema once, cache in `app_data_dir`" and validate against 3.1. The council cut the network fetch (frozen 2022 snapshot; avoids reqwest/TLS/cache-corruption/toggle) and bundles both 3.0 and 3.1, copied to `app_data_dir/schemas/` on first run. The research brief's `enableSchemaRequest` + `http:default` setup is rejected.

## Goal
Red squiggles for spec violations, offline, against the right OpenAPI schema version, on by default.

## User-visible behaviour
- Validation is on by default. Violations show red squiggles with hover messages; the status bar shows the problem count.
- A 3.0.x file validates against the 3.0 schema; a 3.1.x file against 3.1. A file with a missing/unknown `openapi:` value validates against 3.1 and gets the schema's own error on that field.
- Syntax errors squiggle as well (Monaco/monaco-yaml parse diagnostics); typing a syntax error shows a squiggle within 300ms and fixing it clears it.
- Works for YAML (monaco-yaml) and JSON (`jsonDefaults`). Switching language override rebinds the schema.
- No network is touched at any point.

## API shape
`get_schema(version: "3.0" | "3.1") -> String` (schema JSON text, from `app_data_dir/schemas/` or bundled fallback). `OpenedSpec.openapiVersion` is sniffed in Rust from the `openapi:` field.

## Data
`app_data_dir/schemas/oas-3.0.json`, `oas-3.1.json` (copied from resources on first run; JSON-parse checked on every read, fall back to bundled on corruption, rewrite copy).

## Tuning numbers
Squiggle latency target <300ms after typing stops (brief acceptance). No extra debounce beyond monaco-yaml's own.

## Acceptance criteria
- `petstore-3.0.yaml` shows 0 markers; `petstore-3.1.yaml` shows 0 markers; a 3.0 file never gets a line-1 "3.1" version error.
- `schema-invalid.yaml` shows ≥1 marker at the offending line (also in the 3.1 spike for `$dynamicRef`; if gaps exist, list them in Known limitations).
- Syntax error → squiggle <300ms; fix → cleared.
- Schema passed inline; webview makes no HTTP request and has no `http:*` capability (test asserts capability files).
- Deleting/corrupting `app_data_dir/schemas/*` → app still validates (fallback) and restores the copy.
- Validation works in dev and packaged builds.

## Non-goals
Remote fetch/refresh; settings toggle to disable (nothing to disable in M1); custom user schemas; autocomplete beyond what monaco-yaml gives for free; reader-file warnings (Increment 2); linting rules beyond the schema.

## Open questions for the operator
- Drop the remote schema fetch (Option A, assumed) vs keep a `reqwest` fetch with bundled fallback (B)?
