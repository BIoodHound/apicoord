# Round 1: design-critic

## Design Critic: the case against, Increment 1

I expect the board to favour this shape:
- Rust owns file I/O, using `encoding_rs` to detect encoding and line endings.
- A native Rust menu with a Recent submenu that rebuilds.
- A bundled 3.1 schema plus a fetched copy cached in `app_data_dir`, passed inline to monaco-yaml.
- `eemeli/yaml` parsing in a worker, feeding `setSpec` on a lazy-loaded swagger-ui-react.

That is mostly right. The trouble is in how the pieces interact.

### 1. The latency budget can't be met as written
A 200ms debounce plus a p95 target under 250ms leaves **50ms** for parsing, `setSpec` and the swagger-ui re-render. swagger-ui-react's own brief warns that very large specs "drop frames" and that its DOM is heavy. Three things run on the same burst of typing: monaco-yaml's worker parse and validation, our `yaml` parse, and swagger-ui's re-render. On a 10k-line spec I don't believe that fits in 50ms. Nobody has measured it, and I have no numbers either.
**Recommendation:**
- Define the metric now: measured from the *last* keystroke, on Petstore and on a 10k-line fixture, reported separately.
- Hash the parsed JSON and skip `setSpec` when it hasn't changed. Edits to comments or whitespace should never re-render swagger-ui.
- If the 10k-line fixture misses the target, say so in the report. Don't let Petstore stand in for it.

### 2. "Validate against the 3.1 schema" will put squiggles on every 3.0 file
The 3.1 schema requires `openapi` to match `^3\.1\.\d+`, so every 3.0 file gets an error on line 1. The schema also uses 2020-12 `$dynamicRef`. The schema-caching brief calls monaco-yaml "draft-07 centric" and says to "expect gaps".
**Recommendation:**
- Read the `openapi:` field and bundle **both** the 3.0 and 3.1 schemas.
- Spike the `$dynamicRef` behaviour in the first task, not the last.
- The two research briefs contradict each other. monaco-in-tauri.md says `enableSchemaRequest: true` plus an `http:default` permission; cached-remote-schema-offline.md says pass the schema inline. Go inline, and give the webview **no** HTTP permission. If the fetch happens at all, Rust does it, and the bundled copy is what the app relies on. The schema `$id` is a frozen 2022-10-07 snapshot, so the fetch adds network code, a settings toggle and a capability for almost nothing.

### 3. The byte-identical round-trip will fail on mixed line endings
`model.getValue()` normalises the text to one EOL (text-file-roundtrip.md, Risks). Real Windows specs often have mixed endings.
**Recommendation:**
- **Save on a clean buffer writes the original bytes, or does nothing.** That passes the acceptance test by construction.
- Support UTF-8 with and without BOM, and UTF-16. Show the encoding and EOL in the status bar.
- Write atomically (temp file, then rename), retrying when Windows has the target locked.
- The brief's "LF by default" applies only to new files. Preserving the original wins.

### 4. Native menu shortcuts vs Monaco shortcuts
monaco-in-tauri.md says to register Ctrl+S with `editor.addCommand`. A native menu accelerator for Ctrl+S would make **two save paths**, so a double save or a race on the atomic rename is plausible. I haven't verified how WebView2 routes the key, so test it rather than assume.
**Recommendation:**
- Use exactly one owner per shortcut. The menu emits an event; Monaco registers nothing for Save.
- If rebuilding the Recent submenu eats more than a day, the in-webview menu option in native-file-menu-recent-files.md is a legitimate fallback for this increment.
- Paths need normalising (UNC, `\\?\`, case) or MRU de-duplication breaks.

### 5. "Rust commands take a path" moves the security boundary instead of removing it
`tauri.conf.json` has `"csp": null`. swagger-ui renders Markdown from the spec, and specs arrive from colleagues. If the webview is ever compromised (XSS), a `write_file(path, text)` command that accepts any path can overwrite any file on the machine.
**Recommendation:**
- Rust writes only to paths it issued itself: the current document, a path returned by a dialog, or an MRU entry.
- Set a strict CSP.
- Remove `@tauri-apps/plugin-fs` from `package.json`, since nothing should use it.

### Biggest concern
The test gate is pointed at a project that doesn't exist. The configured command runs `mvn -q test` in `backend/` and `npm test` in `frontend/`. The scaffold actually has `src-tauri/` (Rust, so `cargo test`) and `src/` at the root, with `package.json` there too. The gate will either fail for the wrong reason or pass without testing anything. Combine that with points 1 to 3 (performance, 3.0 squiggles, round-trip), which can only be caught with real fixtures, and I can see Increment 1 being declared done after a Petstore demo. Meanwhile Leo's colleagues hit 3.0 false errors, a lagging preview on 10k lines, and noisy git diffs from CRLF files on their first day.

**Before any feature task:** fix the test command to `cargo test` plus `npm test -- --run` from the project root. Then commit these fixtures with tests: Petstore 3.0 and 3.1, a 10k-line YAML spec, and round-trip files in LF, CRLF, mixed, UTF-8 BOM and UTF-16.

*Assumptions: there are no earlier increment reports or open bugs; this is the first round. I have no measured performance data, so point 1 is reasoning from the research briefs and needs a benchmark to confirm or refute it.*
