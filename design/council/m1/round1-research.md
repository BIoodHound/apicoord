# Round 1: research

## Evidence position: Increment 1 (split view)

**Caveat on evidence.** This is a desktop tool, so the "shipped games, frames, px/s" framing doesn't apply. The comparable shipped products are Swagger Editor, Stoplight Studio and VS Code. I use milliseconds throughout. I ran two fresh searches and did not re-read all the briefs, so treat the points below as flagged leads rather than settled evidence.

### 1. Key design questions, especially where the mechanics interact

1. **The 200ms debounce and the 250ms p95 budget.** The debounce takes 200ms of the 250ms. That leaves about 50ms for parse, React commit and swagger-ui render. A 10k-line spec will not fit that, and the validation worker adds load on top.
2. **Last-good view and schema validation.** The two "error" states are separate. A YAML syntax error and a schema violation are different failures. A spec that parses but fails the schema should arguably still render.
3. **Swagger-ui-react remounts.** Passing a new `spec` prop on every parse makes swagger-ui rebuild its state. There is also React compatibility risk.
4. **monaco-yaml workers and the offline schema.** The schema is cached in `app_data_dir`, and the worker can't call Tauri IPC directly. The CSP and worker setup under Vite is a known trouble spot.
5. **Save and the editor model.** Monaco normalises line endings and drops the BOM. It also interacts with the language override: changing the language changes the model, which can reset markers and undo history.
6. **Menu, dirty state and the file lifecycle.** Open, Close and Recent must all go through one dirty-check path, including on window close.

### 2. Recommendations

1. **Budget.**
   - Measure keystroke-to-paint, not just parse time. Run the parse in a worker or off the main thread, and use `requestIdleCallback` or a `startTransition` for the preview.
   - Consider a trailing debounce of 200ms with a fast path for small specs. Otherwise state in the design that p95 <250ms applies to the Petstore-size spec only. I'd ask the board to decide this explicitly, because the brief's numbers are in tension.
2. **Error states.**
   - Retain the last-good view only for parse failures.
   - Show schema violations as squiggles and a status-bar count, and keep rendering.
   - Add a visible "preview stale" indicator, so the user knows the pane isn't current. Swagger Editor shows an error panel instead, and that is the pattern to avoid.
3. **Swagger-ui.**
   - There are [reports of a React 19 strict-mode warning](https://github.com/swagger-api/swagger-ui/issues/10212) from a legacy lifecycle inside swagger-ui-react's `ParameterRow` ([#10648](https://github.com/swagger-api/swagger-ui/issues/10648)). One team [dropped the package and used the unpkg bundle instead](https://github.com/shapehq/framna-docs/pull/588), which is secondhand.
   - Pin React to the version swagger-ui-react supports, and verify that rather than assuming it.
   - Disable Try it out with `supportedSubmitMethods={[]}`. The CSP should also block outbound requests, as a second layer.
   - I found nothing on re-render cost of the `spec` prop. Prototype it with a 10k-line spec before committing.
4. **monaco-yaml.**
   - The README says the worker is required, and that [Vite users should create a local `yaml.worker.js` wrapper](https://cdn.jsdelivr.net/npm/monaco-yaml@5.3.0/README.md). Use Vite's `?worker` imports inside `getWorker`.
   - A [GitLab issue](https://gitlab.com/gitlab-org/gitlab/-/issues/461252) reports validation working in production but not in local Vite dev. Test both the dev build and the packaged build.
   - My searches found nothing on CSP or Tauri. Load the schema in the main thread through IPC and pass it to `configureMonacoYaml` as an inline schema object. Don't let the worker fetch it.
5. **Round trip.**
   - Detect EOL and BOM at read time on the Rust side, and send them in metadata.
   - Call `model.setEOL` after loading, and re-apply the stored EOL and BOM on save.
   - Add tests for CRLF, LF, mixed endings and BOM.
   - Keep the language override as a `setModelLanguage` call. Don't recreate the model.
6. **Lifecycle.** Route everything through one `confirmDiscardIfDirty()` function. Handle Tauri's window close-requested event too, because that is where most editors lose data.

### 3. Biggest concern

The perf budget is the main risk. 200ms debounce plus parse plus swagger-ui render leaves almost no headroom against 250ms p95. Swagger-ui-react is known to be heavy on large specs. The same main thread also hosts Monaco and the validation worker's results. If we build the whole feature first and measure afterwards, we will probably find we have to restructure it. I'd have the dev lane build a throwaway benchmark first: a 10k-line spec, with keystroke-to-paint measured through the real Tauri webview on Windows (WebView2). Browser numbers won't transfer. Decide before implementation whether to cap or degrade the preview for large specs, for example a longer debounce above a line-count threshold, and write that into the acceptance criteria.

Sources:
- [swagger-ui #10212](https://github.com/swagger-api/swagger-ui/issues/10212)
- [swagger-ui #10648](https://github.com/swagger-api/swagger-ui/issues/10648)
- [framna-docs PR #588](https://github.com/shapehq/framna-docs/pull/588)
- [monaco-yaml README](https://cdn.jsdelivr.net/npm/monaco-yaml@5.3.0/README.md)
- [GitLab issue #461252](https://gitlab.com/gitlab-org/gitlab/-/issues/461252)
