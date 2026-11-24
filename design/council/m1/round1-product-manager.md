# Round 1: product-manager

# Vision-fit position: Increment 1 (working split view)

I wrote this from the milestone goal text alone and did not open the product brief or the research briefs. Where I say "the vision," I mean the goal statement's implied pillars: edit a spec, see it rendered at once, and trust the preview. The Increment 2 and 3 features (reader file, copy-context, terminal) are the likely payoff, so Increment 1 has to make the edit-and-see loop feel instant and trustworthy.

## 1. Key design questions

1. **What does the preview do on a parse error?** The last-good view is retained, but the user also needs to know it is stale. A silent stale preview breaks trust.
2. **How do schema squiggles (monaco-yaml) and parse-error state relate?** Both are feedback on the same keystroke. If they disagree, the user will be confused. One example is a spec that is valid YAML but schema-invalid, where the preview renders and the editor shows red.
3. **Does the schema fetch block anything?** The OpenAPI 3.1 schema is cached in `app_data_dir`, so offline-first behaviour matters. First launch with no network must still open a file.
4. **Does the 200ms debounce sit on top of a heavy render?** The p95 <250ms keystroke-to-preview target leaves about 50ms for parsing and rendering. swagger-ui-react is not cheap to re-render.
5. **Where does language detection (extension plus UI override) interact with parsing and validation?** An override from YAML to JSON must re-trigger both the parse and the schema model.
6. **What counts as "done" for Save?** Preserving line endings and encoding is invisible when it works and destructive when it fails, since it produces noisy diffs in the user's repo.
7. **What happens when swagger-ui is "disabled" for Try it out?** Hiding the button is better than a dead one.

## 2. Recommendations

1. **Show a small status indicator on parse error.** It could be a banner or badge on the preview, such as "Showing last valid version: line 42 error", with the squiggle in the editor. The preview stays in place but is visibly marked stale. Live preview tools with a silent stale state (early Markdown previewers) get this complaint. This is the cheapest trust-builder in the increment.
2. **Treat parse errors and schema errors as separate layers.** A parse error freezes the preview. A schema error does not: it renders and squiggles. Show the same count in one status bar so the editor and the preview tell one story.
3. **Make the schema load non-blocking.** Bundle a fallback copy of the 3.1 schema, refresh the cache in the background, and never gate file open on the network. The smallest version that proves the fun is that opening a file works on a plane.
4. **Measure the 250ms budget early.** Run the parse in a worker or at least off the keystroke path. Re-render swagger-ui only when the parsed document actually changed, not on every debounce tick. Put the Petstore and 10k-line perf checks in CI as the QA gate, because the perf numbers are the product's feel.
5. **Make override a single source of truth.** Detect the language from the extension, store an override flag, and have a language change re-run the parse and rebind the schema in one step. The override is rarely used, so keep the UI to a small status-bar dropdown.
6. **Test the Save round trip with CRLF, LF, BOM and UTF-8 fixtures.** Assert that the bytes are identical after open then save with no edit. This is a cheap automated test and it protects user trust.
7. **Set `supportedSubmitMethods` to an empty list and hide the Try it out UI.** Do not show a dead button.

**Smallest version that proves the fun:** open Petstore, type, and see the preview update under about a quarter of a second, with a clear stale marker on errors. Everything else (Recent files, override, and the rest) is table stakes around that loop. If scope slips, cut Recent and the language override UI first, and keep the loop and the error-state clarity.

## 3. Biggest concern

The risk is that the increment gets built as a feature checklist, with the menu, dialogs, schema and Save each working in isolation, while the one thing that makes it feel like a tool is never measured end to end. That thing is typing and seeing the preview update, with honest feedback when the spec is broken. Monaco, monaco-yaml workers and swagger-ui-react are all heavy, and each runs inside a Tauri WebView2 whose performance on Windows we cannot easily check from our Linux dev environment. If we do not set a perf harness and the stale-state UX as acceptance criteria up front, we will find a laggy or silently stale preview at the end. At that point it will be too late to fix without rework in Increments 2 and 3, which build on this loop.
