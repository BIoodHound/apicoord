# Round 2: architect

# Architect, round 2

**I checked the critic's test-gate claim and it holds.** The project has `projects/apicoord/package.json` and `src-tauri/Cargo.toml`, but no `backend/` or `frontend/` directory. The configured gate (`mvn -q test` in `backend/`, `npm test` in `frontend/`) therefore tests nothing. Fixing it to `cargo test` in `src-tauri/` plus `npm test -- --run` at the root becomes the first item of T0. I missed this, and it should have been my top concern.

## Where I agree
- **Choose the schema by version.** QA, the critic and I all bundle both the 3.0 and 3.1 schemas, pick one by reading the `openapi:` field, and pass it inline. The webview gets no HTTP permission.
- **Clean-buffer save writes the original bytes or skips the write.** The critic is right. It makes "byte-identical" true by design instead of by careful testing. Once the buffer has been edited, we save with the majority line ending (QA's rule) and show it in the status bar.
- **Paths are allow-listed and `plugin-fs` is removed.** The critic and I agree on both.
- **Parse results carry a sequence number** (QA Q3), so a stale result can't overwrite a newer one. I'm adding this to the T6 contract.

## Where I've changed my position
- **Ctrl+S.** I had proposed binding it both as a menu accelerator and through Monaco, with de-duplication. The critic's "one owner per shortcut" is cleaner and avoids a race on the atomic rename. New plan: on day one, a spike checks whether the native accelerator fires while Monaco has focus in WebView2. If it does, the menu owns Ctrl+S. If it doesn't, only Monaco's `addCommand` handles it, and the menu item shows the shortcut as a label without a real accelerator.
- **Remote schema fetch.** The critic convinced me. The schema at the `$id` URL is a frozen snapshot, so fetching it adds `reqwest`, a TLS stack, cache-corruption tests (QA Q7) and a settings toggle, all for no benefit. For Increment 1, I'll copy the bundled schemas into `app_data_dir` on first run. That meets the brief's wording with no network access. **This needs operator sign-off.**
- **Windows CI runner.** I'm dropping it as a gate. QA is right that the gate should be `performance.mark` numbers measured on the target laptop and written into the increment report. Shared CI virtual machines give noisy timings.

## Where I disagree
- **PM: put the perf checks in CI.** CI runs on Linux ARM with no WebView2, so a perf check there would tell us nothing about the target.
- **QA: a toast that updates in place, versus PM/research: a stale badge.** I recommend a persistent badge on the preview, because a toast disappears while the preview is still stale. Either way, the T4 store will expose one `previewStatus` field (`ok | stale(line, msg) | empty-invalid`), and both the UI and the tests read that field. This also gives a defined state for a file that is invalid when first opened.
- **UTF-16 support is not free.** `encoding_rs` can decode UTF-16, but under the WHATWG rules its encoder writes UTF-8 when the target is UTF-16. Saving UTF-16 therefore needs hand-written `encode_utf16` plus BOM code in `textcodec.rs`. That adds a small amount of work and one fixture to T1.
- **Research: "pin React".** In T0 I'll check the React version range swagger-ui-react actually supports before pinning anything. The issues cited are StrictMode warnings, not breakages, so they don't justify switching to the unpkg bundle.

## Changes to my lane split
- **T0** now also covers fixing the test command and dropping `reqwest`.
- **New T0b (QA):** commit the fixtures and the timing harness before any feature task starts. The fixtures are Petstore 3.0 and 3.1, a 10k-line spec, and line-ending/encoding files for LF, CRLF, mixed endings, BOM and UTF-16.
- **T1–T7** are unchanged.
