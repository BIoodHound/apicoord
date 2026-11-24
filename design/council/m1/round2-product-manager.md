# Round 2: product-manager

# Round 2: product-manager (vision fit)

## Where I agree

- **The latency budget is the main risk (research, design-critic, architect).** My round 1 said to measure early, but I didn't spot the arithmetic they did. A 200ms debounce leaves about 50ms of the 250ms. Design-critic's fix is the right one: define the metric from the *last* keystroke, and report Petstore and the 10k-line fixture separately. Petstore must not stand in for the large file. Hashing the parsed JSON so comment-only edits skip `setSpec` is cheap and protects the feel.
- **3.0 files get false squiggles (QA, design-critic).** I missed this. A first-day false red line on a valid 3.0 Petstore would destroy trust, which is the pillar I was defending. I now support sniffing `openapi:` and bundling both schemas.
- **Parse errors and schema errors are separate layers.** All of us converged on this, including the stale indicator. QA's addition is better than mine: an invalid-on-open file needs a defined empty state, not a blank pane. Non-object YAML counts as a parse failure.
- **Clean-buffer Save writes the original bytes (design-critic, QA).** This passes the "no noisy diffs" promise by construction.
- **Inline schema, no HTTP permission for the webview.** I accept the architect's and design-critic's argument. I had suggested a background refresh. Design-critic points out that the schema `$id` is a frozen snapshot. Given that, I'd now make the fetch optional, and cut it first if scope slips.

## Where I disagree

- **Native Recent submenu vs. in-webview menu.** I originally said to cut Recent first. The operator asked for Recent explicitly, so I shouldn't drop it. I side with design-critic's fallback: if the native submenu rebuild runs over a day, an in-webview list is acceptable for this increment.
- **A Windows CI runner as an Increment 1 requirement (architect).** The architect is right that we can't verify performance here. But a runner is a release-engineer scope expansion that the operator didn't ask for. I'd keep the scripted timing harness, with `performance.mark` calls and a manual run by QA on Windows. I'd make the runner a recommendation to the operator, not an acceptance gate. QA agrees that perf shouldn't be a CI gate on a Pi.
- **The visible-section fallback for swagger (architect).** This is premature. Decide it only if the harness shows a miss. The cheaper first fallback is a longer debounce above a line-count threshold, which is research's suggestion.

## What I'd change in my position

1. Smallest version that proves the fun: Petstore 3.0 and 3.1 open with **zero false squiggles**, typing updates the preview within budget, and errors show a stale badge.
2. Add as spec criteria: the metric definition, the empty state, out-of-order parse results discarded (QA Q3), and one dirty-check path including window close.
3. Make the fix to the test command a task zero. Design-critic's point that the gate points at a non-existent `backend/` and `frontend/` is correct and blocks everything.
4. Cut order if scope slips: optional schema fetch, then the language override UI, then the native Recent submenu (falling back to the in-webview list).
