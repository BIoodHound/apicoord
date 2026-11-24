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
