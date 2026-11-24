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
