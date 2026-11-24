# Design council: milestone 1

## Summary

The council agreed on the shape of Increment 1. Rust owns file I/O, the schema is passed inline to monaco-yaml, and both the 3.0 and 3.1 schemas are bundled. A parse error freezes the preview behind a persistent stale badge, and a schema error only produces squiggles. The main unresolved risk is performance. A 200ms debounce leaves about 50ms of the 250ms p95 budget, and nobody has measured it. So a fixture set, a timing harness and a fix to the broken test gate come before any feature work. A few items remain open: who owns Ctrl+S, whether the schema fetch is cut, and how Windows performance gets verified.

## Decisions

### 1. Test gate and fixtures come first (task zero)
**Decision:** T0 changes the test gate to `cargo test --manifest-path src-tauri/Cargo.toml` plus `npm test -- --run` from the project root. A new T0b (QA) commits the fixtures and the timing harness before any feature task starts. The fixtures are:
- Petstore 3.0 and 3.1.
- A generated 10k-line YAML spec.
- LF, CRLF, mixed-ending, UTF-8 BOM, UTF-16LE and no-final-newline files.
- A non-object YAML file.
- A spec that is invalid on open.

**Why:** The design-critic's biggest concern was that the gate points at `backend/` and `frontend/`, which don't exist. QA and the architect each checked this and confirmed it. Both said they had missed it in round 1. Until it is fixed, a green result tests nothing.

**Rejected:** Building features first and adding fixtures later. QA and the design-critic both warned that this ends in sign-off on a Petstore demo.

**Dissent:** None.

### 2. File I/O, encoding and save semantics
**Decision:**
- Rust owns all file I/O through `open_spec_dialog`, `open_recent` and `save_spec`. It detects encoding, BOM and EOL on read and returns them as metadata.
- `plugin-fs` is removed.
- Writes are atomic (temp file, then rename), with a retry on Windows file locks.
- Saving a clean buffer writes the original bytes or skips the write.
- Saving an edited buffer uses the majority EOL and shows it in the status bar. The stored BOM and encoding are re-applied.
- Other legacy encodings are refused with a clear error.
- UTF-16 needs hand-written encoding in `textcodec.rs`, because `encoding_rs` won't encode to UTF-16 (architect, round 2).

**Why:**
- The architect cited text-file-roundtrip.md. `TextDecoder` can't re-encode non-UTF-8 files, and Recent paths lose their fs scope after a restart.
- The design-critic and QA showed that Monaco's `getValue()` normalises mixed line endings. A clean-buffer write makes "byte-identical" true by construction. The architect accepted this in round 2.

**Rejected:** Using Monaco as the sole owner of EOL (it flattens mixed endings). Lossy guessing of legacy encodings (QA).

**Dissent:** None. The architect's round 1 position moved to the critic's and QA's.

### 3. Schema selection and delivery
**Decision:**
- Both the 3.0 and 3.1 schemas are bundled. Rust reads the `openapi:` field and picks one.
- The schema is passed inline to `configureMonacoYaml`, and to `jsonDefaults` for JSON files.
- The webview gets no HTTP permission.
- A day-1 spike confirms that 3.1 `$dynamicRef` produces squiggles in monaco-yaml.
- The remote `reqwest` fetch is cut from Increment 1. The bundled schemas are copied into `app_data_dir` on first run.

**Why:**
- QA and the design-critic showed that the 3.1 schema requires `^3\.1\.\d+`, so every 3.0 file would get a line-1 error. The PM and research conceded this.
- Research called monaco-in-tauri.md the thinner brief, and the architect rejected its `enableSchemaRequest` setup. All members supported the inline approach.
- The design-critic noted that the `$id` is a frozen 2022 snapshot, so a fetch adds `reqwest`, rustls, a cache-corruption path and a toggle for no benefit. The architect agreed in round 2, and the PM would cut it first anyway.

**Rejected:** `enableSchemaRequest: true` plus `http:default`. A background refresh of the cache.

**Dissent:** None among the members. The operator asked for a schema "cached in app_data_dir", so the change needs sign-off (see Open questions).

### 4. Latency budget and the metric
**Decision:**
- The metric is measured from the last keystroke to the swagger commit, using `performance.mark`. Petstore and the 10k-line fixture are reported separately, and Petstore does not stand in for the large file.
- The parsed JSON is hashed. If it is unchanged, `setSpec` is skipped, so comment-only edits don't re-render swagger.
- Parse runs in a worker, and each result carries a sequence number. Results older than the newest one shown are discarded.
- Numbers are measured on the target Windows laptop and recorded in the increment report.
- If the 10k-line fixture misses the budget, the report says so.
- The first fallback is a longer debounce above a line-count threshold.

**Why:**
- The design-critic and research did the arithmetic: 200ms of debounce leaves about 50ms.
- QA contributed sequence tagging, which the architect and research adopted.
- The hash was proposed by the design-critic and backed by research, the PM and the architect.

**Rejected:**
- Perf checks as a CI gate (PM, round 1). The PM withdrew this after QA and the architect pointed out that CI is a Linux ARM Pi with no WebView2.
- A Windows CI runner as an acceptance gate. Shared runners give noisy timings.
- The architect's "render only the visible tag section" fallback. It has no known precedent (research) and is a new feature (design-critic). It is revisited only if the harness shows a miss.

**Dissent (unresolved):** Research noted that the worker's structured-clone cost is unmeasured, so a worker is not yet shown to help. The council kept the worker as the design but made the harness the judge.

### 5. Error states: parse versus schema
**Decision:**
- A parse failure keeps the last-good view and shows a persistent stale badge with the line and message, plus an editor squiggle.
- A schema violation still renders, and only squiggles.
- Non-object YAML (empty, scalar or list) counts as a parse failure.
- A file that is invalid on first open has no last-good view, so it shows a defined empty-invalid state.
- The store exposes one `previewStatus` field: `ok | stale(line, msg) | empty-invalid`. The UI and the tests both read it.
- The status bar shows the stale badge and Monaco's marker count separately.

**Why:**
- The PM proposed the stale marker and the two-layer split. The design-critic and the architect favoured a persistent badge over a toast. At a 200ms debounce a toast would flash during typing.
- QA contributed the empty state and the non-object rule, citing the swagger-ui crash risk.

**Rejected:**
- A toast on every parse error, including QA's update-in-place toast. A toast disappears while the preview is still stale.
- A single reconciled error count (PM, round 1). QA objected that it merges two asynchronous sources, and the PM did not press it.

**Dissent:** None remaining.

### 6. Shortcut ownership (Ctrl+S)
**Decision:** There is one owner per shortcut. A day-1 spike checks whether the native menu accelerator fires while Monaco has focus in WebView2.
- If it fires, the menu owns Ctrl+S and Monaco binds nothing.
- If it doesn't, only Monaco's `addCommand` handles it, and the menu shows the shortcut as a label.
- There is no de-duplication layer.
- QA tests that one Ctrl+S produces exactly one `save_spec` call.

**Why:** The design-critic, QA and the architect (round 2) converged on this. The architect dropped the dual-binding plan.

**Rejected:** Dual binding with de-duplication, because it builds a race on the atomic rename.

**Dissent:** None. Research flagged that nobody has evidence for how WebView2 routes the key, which is why this is a spike and not a decision.

### 7. Lifecycle and dirty state
**Decision:**
- One `confirmDiscardIfDirty()` path (Save / Don't Save / Cancel) covers Close, Open over an open file, picking a Recent file, and the window close-requested event.
- Save As updates the current path and the Recent list.
- The Recent list holds 5 entries, as the brief says. Paths are normalised for case, `\\?\` and UNC forms before de-duplication.
- A missing Recent file is removed from the list, with a notice.
- Reopening a Recent file goes through a Rust read command.

**Why:** Research and QA raised this. The architect added the `onCloseRequested` listener.

**Dissent:** None.

### 8. Native menu and Recent submenu
**Decision:** A Rust `menu.rs` builds the native menu, and the Recent submenu is rebuilt when the list changes. The MRU list is a JSON file in `app_data_dir`. If the native Recent rebuild takes more than a day, an in-webview Recent list is acceptable for this increment.

**Why:** The operator asked for Recent explicitly, so the PM won't cut it. The design-critic proposed the fallback and the PM accepted it.

**Dissent:** None.

### 9. Language detection and override
**Decision:**
- `.yaml` and `.yml` open as YAML, and `.json` as JSON.
- For any other extension, the first non-blank character decides: `{` means JSON, anything else is YAML.
- The status-bar override is session-only. It uses `setModelLanguage` without recreating the model, and re-runs the parse and the schema binding in one step.
- The override does not change the saved bytes.

**Why:** QA proposed the content sniff and the session-only rule. The PM asked for a single source of truth. Research and the design-critic noted that recreating the model resets markers and undo history.

**Dissent:** None.

### 10. Security boundary
**Decision:**
- Rust only reads or writes paths it issued: a dialog result, the current document, or an MRU entry. These are held in managed state.
- `csp: null` is replaced with a strict CSP.
- `supportedSubmitMethods` is set to `[]`, which hides Try it out, and the CSP blocks outbound requests as a second layer.
- `plugin-fs` is removed.

**Why:** The design-critic argued that a path-taking command moves the boundary, and that swagger renders Markdown from specs that arrive from colleagues. The architect proposed the allow-list and a CSP. The PM and QA supported hiding the dead button.

**Dissent:** None.

### 11. Offline Monaco and dependencies
**Decision:**
- `loader.config({ monaco })` uses a local `monaco-editor`, because `@monaco-editor/react` otherwise loads from jsDelivr.
- Workers use Vite `?worker` imports.
- Validation is tested in both the dev build and the packaged build.
- The React version range that swagger-ui-react supports is verified by a build in T0 before anything is pinned.

**Why:** The architect raised the jsDelivr default. Research cited the monaco-yaml README and a GitLab issue about dev builds. Research flagged its React 19 evidence as secondhand.

**Rejected:**
- `vite-plugin-monaco-editor-esm`, which is barely maintained (architect).
- Switching to the unpkg bundle, because the cited issues are StrictMode warnings and not breakages (architect).

**Dissent:** None.

## Interaction rules

1. Parse failure freezes the preview and shows the stale badge. Schema failure never freezes the preview.
2. `previewStatus` is the only source for preview-state UI and tests.
3. Parse results are tagged with an increasing sequence number. A result older than the newest one shown is dropped.
4. If the parsed JSON hash is unchanged, `setSpec` is not called.
5. A language override re-runs the parse and the schema binding together, without recreating the model.
6. The schema is chosen from the `openapi:` field. 3.0 files never validate against the 3.1 schema.
7. The webview has no HTTP permission, and the schema is always passed inline.
8. A clean buffer saves the original bytes or skips the write. An edited buffer saves with the majority EOL, the stored BOM and the stored encoding, and the status bar shows the EOL.
9. Whether Save As of an unedited buffer writes the original bytes is not yet fixed (see Open questions).
10. Every shortcut has exactly one owner. One Ctrl+S gives exactly one `save_spec` call.
11. Close, Open, Recent and the window close-requested event all go through `confirmDiscardIfDirty()`.
12. Rust accepts only paths it issued itself.
13. Performance is measured from the last keystroke, with Petstore and the 10k-line fixture reported separately. Numbers come from the target Windows laptop and go in the increment report. CI does not gate on them.
14. Cut order if scope slips: the optional schema fetch (already cut), then the language override UI, then the native Recent submenu (falling back to the in-webview list).
15. No feature task starts until the test-gate fix (T0) and the fixtures and harness (T0b) land.

## Open questions for the Operator

1. **Drop the remote schema fetch?** The brief says the schema is "cached in `app_data_dir`".
   - Option A: copy the bundled schemas into `app_data_dir` on first run, with no network code.
   - Option B: keep a `reqwest` fetch with a bundled fallback.
   - Leaning: A. The upstream schema is a frozen snapshot, and B adds a TLS stack, a corruption path and a toggle.
2. **Windows performance verification.**
   - Option A: a manual run by QA on a Windows laptop, written into the report.
   - Option B: add a Windows CI runner.
   - Leaning: A as the gate. B as a later recommendation, because shared runners give noisy timings.
3. **What if the 10k-line fixture misses 250ms p95?**
   - Option A: report the miss and ship, then use a longer debounce above a line-count threshold.
   - Option B: hold the increment.
   - Leaning: A, and the report must state the miss.
4. **Save As on an unedited buffer: original bytes or re-encode?** QA raised this and nobody answered it. Leaning: original bytes, which is consistent with the clean-buffer rule.
5. **Does the session-only language override survive Save As?** QA raised this and nobody answered it. Leaning: yes for the session, since the override is not stored in the file.
6. **Mixed-EOL files after an edit.** The rule is to save with the majority EOL and say so in the status bar. The alternative is to ask first. Leaning: no prompt, only the status-bar note.
7. **Does the UI show the encoding and EOL?** The design-critic and QA want both in the status bar. Leaning: yes.

## Sources

- [swagger-ui #10212](https://github.com/swagger-api/swagger-ui/issues/10212) (research)
- [swagger-ui #10648](https://github.com/swagger-api/swagger-ui/issues/10648) (research)
- [framna-docs PR #588](https://github.com/shapehq/framna-docs/pull/588) (research, secondhand)
- [monaco-yaml README](https://cdn.jsdelivr.net/npm/monaco-yaml@5.3.0/README.md) (research)
- [GitLab issue #461252](https://gitlab.com/gitlab-org/gitlab/-/issues/461252) (research)
- Research briefs cited by members: `studio/research/monaco-in-tauri.md`, `cached-remote-schema-offline.md`, `text-file-roundtrip.md`, `native-file-menu-recent-files.md`, `swagger-ui-react-embed.md`
