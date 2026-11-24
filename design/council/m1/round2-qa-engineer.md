# Round 2: qa-engineer

# QA round 2: testability and edge cases

## Where I agree
- **The test gate is broken.** The design-critic is right, and I checked it. The project has `package.json` and `src-tauri/Cargo.toml` at its root, and there is no `backend/` or `frontend/`. The configured `mvn`/`frontend` commands test nothing. My own role prompt points at the same wrong paths, and I missed this in round 1. **This blocks everything else**: T0 has to switch the gate to `cargo test --manifest-path src-tauri/Cargo.toml` plus `npm test -- --run` from the project root before I write any gate test.
- **Pick the schema from the `openapi:` field, bundle both schemas, pass them inline, and do a `$dynamicRef` spike.** All five of us now agree on this.
- **Saving an unedited buffer writes the original bytes.** That gives a byte-identical round-trip by design, mixed line endings included.
- **One owner per shortcut.** Testing this is my job: one Ctrl+S must lead to exactly one `save_spec` call. I'll mock `invoke` and count the calls.

## Where I disagree
- **The architect's "bind Ctrl+S in Monaco too, then de-duplicate."** That design has two save paths and a dedupe step that is hard to get right. Nobody has shown that WebView2 swallows the accelerator. The architect calls it a "risk", without evidence. I'd keep one owner (the menu) and add a manual-checklist item: "press Ctrl+S while the editor has focus on Windows, and confirm it saves once." Add the Monaco binding only if that check fails.
- **The PM's idea of putting the perf numbers in CI.** CI runs on a Pi with Linux and no WebView2, so the numbers would be meaningless. I still hold that perf is measured with `performance.mark` on the target laptop and recorded in the increment report. The architect's Windows runner would help, but it shouldn't block this increment.
- **The PM's "show one shared error count in the status bar."** monaco-yaml's markers and our parse result come from two separate workers. One count would mean reconciling two asynchronous sources, and any disagreement between them is invisible. I'd show the two separately: a stale badge for parse errors, and Monaco's own marker count for schema errors.

## What I'd change in my own position
- **Add a "parse result unchanged, skip `setSpec`" rule** (design-critic and architect). It needs a test: an edit that only touches a comment must not re-render swagger.
- **Add a rule that Rust only accepts paths it issued itself** (design-critic). It needs a test: `save_spec` called with a path that never came from a dialog or the MRU must return an error.
- **Add an offline Monaco check** (architect, Q4). The gate test asserts that `loader.config` is given a local `monaco` instance. On the manual checklist: start the app with the network off and confirm the editor appears.
- **Make the fixture set T0's output**, not something I make later. It should hold: Petstore 3.0 and 3.1, a generated 10k-line YAML, LF, CRLF, mixed endings, UTF-8 BOM, UTF-16LE, no final newline, a non-object YAML, and an invalid-on-open spec.
- **Rules still unwritten, which need a product-manager answer before tests:**
  - What the empty state looks like when a file is invalid on first open.
  - Whether Save As of an unedited file writes the original bytes or re-encodes them.
  - Whether a session-only language override survives Save As.
