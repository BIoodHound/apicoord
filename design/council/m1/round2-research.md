# Round 2: research

# Round 2: research (evidence)

I ran no new searches this round, so everything below rests on round-1 evidence and the existing briefs. Nothing here is freshly verified.

## Where I agree

- **QA and design-critic on 3.0 files.** They showed the strongest evidence. The 3.1 schema requires `openapi` to match `^3\.1\.\d+`, so every 3.0 file would get a line-1 error. I missed this in round 1. I now back bundling both schemas and picking one from the `openapi:` field.
- **Architect and design-critic on inline schema.** Both briefs point to inline schema. I also found nothing on CSP behaviour for `enableSchemaRequest` under Tauri. I would flag monaco-in-tauri.md as the thinner brief and the one to down-weight.
- **QA on out-of-order parse results.** I hadn't thought of this. It follows directly from moving the parse into a worker, which I recommended. I'd add sequence tagging to my own position.
- **Design-critic on hashing the parsed result.** I support skipping `setSpec` when the parsed JSON is unchanged. It is cheap and it directly addresses the budget.

## Where I disagree

- **Design-critic's point 4 and the architect on shortcuts.** They disagree with each other, and neither has evidence. The design-critic says Monaco registers nothing for Save. The architect says bind Ctrl+S in both places with de-duplication. I have no source on how WebView2 routes accelerators, so I can't settle it. The board should treat it as a spike item, not a decision.
- **Product-manager's "run the parse in a worker or off the keystroke path" as a fix.** A worker removes parse cost from the main thread but adds a structured clone back. Nobody has measured that cost on a 10k-line spec. I'd stop calling the worker a solution until the harness gives numbers.
- **Architect's "swagger only for the visible tag section" fallback.** I found no precedent for it in swagger-ui-react, and it may need custom plugin work. I'd label it unproven and prefer a longer debounce above a line-count threshold as the first fallback.

## What I'd change in my position

1. Add sequence-tagged parse results.
2. Make the 3.0 and 3.1 schema pairing a day-1 spike together with `$dynamicRef`.
3. State plainly that my React 19 evidence on swagger-ui-react is secondhand, so the version pin must be verified by a build, not taken from my links.
4. Back the Windows timing harness as an acceptance criterion. All five members who raised performance rest on reasoning, not measurement, and mine is no exception.
