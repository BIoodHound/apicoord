# Round 2: design-critic

## Design Critic, round 2

**Where the board agreed, so I'm dropping the point**
- **3.0 files getting squiggled by the 3.1 schema.** QA (Q1) and architect (Q3) both said: bundle both schemas, pick one from the `openapi:` field, and spike `$dynamicRef` on day 1. That settles it.
- **Inline schema, no webview HTTP access.** Architect explicitly rejected the `enableSchemaRequest` approach, so this is closed too.
- **Arbitrary-path writes.** Architect's allow-list in Rust managed state matches my point 5. Removing `plugin-fs` and setting a real CSP cover the rest.

**Where I'm still pressing**
1. **Two owners for Ctrl+S.** Architect wants the native accelerator *and* a Monaco `addCommand` for Ctrl+S, with de-duplication. That builds the race I warned about and then adds code to hide it. Nobody has evidence that WebView2 swallows the accelerator; architect calls it a "risk", not something they've seen. Test first. Bind Monaco only if the native accelerator actually fails, and then make Monaco the *only* owner, with no de-dup logic.
2. **Round-trip ownership.** Architect says "Monaco owns EOL: `setEOL` on open, `getValue` on save." That is exactly the path that flattens mixed line endings. QA (Q4) proposed what I proposed: a clean buffer writes the original bytes, and only an edited buffer gets the majority EOL with a note in the status bar. Architect hasn't answered this. T1's acceptance criteria should say it explicitly.
3. **The Rust `reqwest` schema fetch.** It's still in T0 and T3. The upstream schema is a frozen 2022 snapshot. The fetch pulls in reqwest/rustls, a cache-corruption path that QA now has to test (Q7), and a settings toggle, all to refresh a file that won't change. I'd cut it from Increment 1. Nobody has argued for keeping it.
4. **The test gate is still broken.** The configured command runs `mvn` in `backend/`, but the code is in `src-tauri/` and `src/`. Architect's T0 owns the config files but doesn't list this fix. It has to be in T0, or every later "green" means nothing.

**A new interaction no one has raised**
YAML is invalid almost constantly while you type: half-typed keys, unclosed quotes. Architect and QA both specify a **toast** on parse error. At a 200ms debounce, that toast will flash on and off for most of a typing session. PM's version is better: a persistent "stale" badge on the preview, plus a squiggle in the editor. No toast.

**Scope creep**
- **Architect's perf fallback** ("render swagger only for the visible tag section") is a new feature, not a fallback. Wait for numbers before building it.
- **A Windows CI runner** is worth having, but perf numbers from shared runners are noisy. I agree with QA: perf goes in a manual Windows measurement written into the report, not a CI gate.

**Changes to my own position**
- I concede PM's cut order (Recent and the language override UI go first).
- I adopt QA's two rules: non-object documents count as parse failures, and out-of-order parse results get sequence numbers.
- My biggest concern is unchanged: unless the T0 gate fix and the fixtures land first, this increment gets signed off on a Petstore demo.
