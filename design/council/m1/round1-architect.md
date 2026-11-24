# Round 1: architect

# Architect position: Increment 1 feasibility, cost and lane split

**Ground truth.** The repo is a bare Tauri 2 scaffold. It has a `ping` command, unused `plugin-fs` and `plugin-dialog`, `csp: null`, and no Monaco, swagger-ui or yaml dependencies. There are no earlier increments and no lessons yet. `ipc-contract.md` is the contract we'll actually use; `api-contract.md` and `pom.xml` don't apply to this project.

## 1. Key design questions and recommendations

**Q1. Where does file I/O live?**
All file I/O should go through Rust commands, and `plugin-fs` should be removed:
- `open_spec_dialog()`, `open_recent(path)` and `save_spec(path, text, meta)` return or accept `{text, encoding, hasBom, eol}`.
- Decoding and encoding use `encoding_rs`. Saves are atomic (write a temp file, then rename, with a retry for Windows file locks).

Two reasons, from text-file-roundtrip.md and native-file-menu-recent-files.md. First, `TextDecoder` can't re-encode files that aren't UTF-8, so "byte-identical on reopen" fails. Second, Recent paths lose their runtime fs scope after a restart. Monaco owns the line endings: we call `model.setEOL()` on open and `getValue()` on save, and never string-replace. Security: a Rust command that takes any path is a file-read hole, so Rust keeps an allow-list in managed state of paths that came from a dialog or the MRU list.

**Q2. Native menu or a React menu?**
Native. A Rust `menu.rs` builds the menu and emits `menu:*` events, and the Recent submenu is rebuilt when the MRU list changes. The MRU list is a JSON file in `app_data_dir`, written by Rust, capped at 5, with Windows paths normalised before de-duplicating. **Risk:** while WebView2 has focus it can swallow menu accelerators. Ctrl+S should also be bound through Monaco `addCommand` to the same handler, with de-duplication so it fires once.

**Q3. How does schema validation get the schema?**
Bundle the 3.0 and 3.1 schemas as resources. Add a Rust `get_openapi_schema(version)` command that fetches once with `reqwest` (rustls), caches atomically in `app_data_dir`, and falls back to the bundled copy. The schema is passed **inline** to `configureMonacoYaml`, and to `jsonDefaults` for JSON files. I reject the `enableSchemaRequest: true` + `http:default` setup in monaco-in-tauri.md. It conflicts with cached-remote-schema-offline.md and would widen capabilities and CSP for no gain. Sniff the `openapi:` field to pick 3.0 or 3.1. Run a spike test on day 1 for 3.1 `$dynamicRef` support in monaco-yaml.

**Q4. Offline Monaco.**
`@monaco-editor/react` loads Monaco **from jsDelivr by default**. That breaks the brief's no-network rule and fails offline. We need `loader.config({ monaco })` with a local `monaco-editor`, and workers set up through Vite `?worker` imports. I'd avoid `vite-plugin-monaco-editor-esm`, which is barely maintained. This edits `vite.config.ts` and `package.json`, so it's my task.

**Q5. Parse pipeline and performance.**
Parse with eemeli `yaml` in a Web Worker and post JSON back. If a cheap hash shows the parsed result hasn't changed, skip `setSpec` (comment-only edits shouldn't re-render swagger). Keep the last-good spec in the store and show the toast on error. swagger-ui gets `supportedSubmitMethods: []` and `docExpansion: "list"`. Monaco and swagger-ui are both lazy-loaded.

**Q6. CSP and the error shape.**
Replace `csp: null` with `default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src ipc: http://ipc.localhost`. `unsafe-inline` styles are needed because Monaco and swagger-ui inject styles. Separately, `error.rs` already serialises errors as `{code, message}`, but the docs say they cross IPC as a prefixed string. I'll fix the docs to match the code.

## 2. Ownership split (so tasks don't collide)

| # | Owner | Files |
|---|---|---|
| T0 | architect, **first and blocking** | `Cargo.toml` (encoding_rs, reqwest/rustls); `package.json` (monaco-editor, @monaco-editor/react, monaco-yaml, swagger-ui-react, yaml); `vite.config.ts` workers; CSP; `capabilities/file-menu.json`; stub `models/document.rs` DTOs; `lib.rs` registry stubs; `ipc-contract.md`; `architecture.md` state-flow section |
| T1 | rust-dev | `commands/file.rs`, `services/textcodec.rs` + round-trip fixtures (LF, CRLF, BOM, UTF-16) |
| T2 | rust-dev | `commands/recent.rs`, `menu.rs` |
| T3 | rust-dev | `commands/schema.rs`, `resources/schemas/` |
| T4 | frontend | `features/document/` store + `src/ipc/*.ts`. **Lands before T5–T7.** |
| T5 | frontend | `features/editor/` (Monaco, monaco-yaml, language dropdown) |
| T6 | frontend | `features/preview/` (parse worker, swagger, last-good, toast) |
| T7 | frontend | `features/file/` (menu listeners, dirty guard, `onCloseRequested`) + `App.tsx` split layout |

The two places tasks can collide are `lib.rs` and `App.tsx`. I own `lib.rs` and pre-register every command and menu. T7 is the only task that edits `App.tsx`. The document store is the one shared state, and it's frozen in T4.

## 3. Biggest concern

**We can't verify the Windows performance targets in our own environment.** The pipeline runs on Linux ARM, so there's no WebView2, MSI or NSIS here. Two acceptance criteria are the riskiest in the milestone: keystroke-to-preview p95 under 250 ms, and a 10k-line spec staying responsive. Each keystroke on a 10k-line spec pays for a parse in our worker, a second parse in monaco-yaml's own worker, a structured clone back to the main thread, and a full swagger-ui DOM re-render. The swagger-ui brief itself says it drops frames past about 200 operations. If we only find this out at manual acceptance, we'll be redesigning in the wrong increment.

I'd ask that this increment include:
- a Windows CI runner from the release-engineer;
- a scripted timing harness (`performance.mark` around keystroke → worker → `setSpec` → swagger commit) that QA runs on a generated 10k-line fixture;
- an agreed fallback if the budget is blown: render swagger only for the visible tag section.
