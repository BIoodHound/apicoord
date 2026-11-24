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
