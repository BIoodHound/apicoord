# Increment 1 — design-review gate, round 1

**Operator verdict:** APPROVED, with answers to 7 open questions and 1 procedural note.

## How the CD answered the open questions

| # | Question | Board leaning | CD answer | Could the team have settled it? |
|---|---|---|---|---|
| 1 | Drop remote schema fetch | A: bundle, no network | A | No. It departs from the brief's wording, so asking was correct. |
| 2 | Windows perf verification | A: manual QA run | A | Mostly. A CI runner was scope the operator never asked for. |
| 3 | 10k fixture misses p95 | **A: ship + longer debounce** | **B: hold, "no silent degradation"** | **Should have leaned B.** See below. |
| 4 | Save As of unedited buffer | original bytes | as leaning | **Yes.** It follows from the agreed clean-buffer rule. |
| 5 | Override survives Save As | yes, resets on open-other | as leaning | Yes. Nobody disagreed. |
| 6 | Mixed-EOL prompt | no prompt, status note | as leaning | **Yes.** The board was unanimous in round 2. |
| 7 | Show encoding/EOL | yes | as leaning | **Yes.** The critic and QA both asked for it and nobody objected. |
| P | architecture.md / ipc-contract.md | left in PM's reply | architect does it as the first build task | Yes. The architect already had it in T0 in round 1. |

**The one reversal (Q3).** The brief states p95 <250ms as an acceptance number. A longer debounce above 5k lines is a fallback that by definition breaks that number for the 10k fixture. Research proposed the degradation in round 1 ("state p95 applies to Petstore only"). The PM adopted "longer debounce" as the first fallback. The critic insisted the miss be *reported*, but did not challenge the fallback itself. Every role had the evidence: the brief's number plus the debounce arithmetic. The PM, as moderator, owned the leaning.

## Board quality

- **The design-critic carried the round.** It caught the broken test gate (`mvn`/`backend/` vs `cargo`/`src-tauri`), the 3.0 false squiggles, the mixed-EOL round-trip failure, the Ctrl+S double path, the path-taking-command boundary and the frozen-`$id` fetch. The operator ratified all of these (Q1, Q7, task-zero ordering).
- **QA and the architect both admitted missing the test gate in round 1.** QA's role prompt itself names the wrong paths.
- **The decision record is faithful.** Dissent is kept (research's unmeasured structured-clone cost; WebView2 accelerator routing as a spike). Withdrawn positions are attributed (PM's CI perf gate, the architect's dual Ctrl+S binding and fetch). Sources are listed.
- **Research.** Two briefs contradict each other on schema delivery: monaco-in-tauri.md uses `enableSchemaRequest` + `http:default`, while cached-remote-schema-offline.md passes the schema inline. Research missed the 3.0/3.1 split that its own cached-remote brief §4 states. swagger-ui-react-embed.md recommends "render only the current section", and research later called that same idea "no known precedent". latency-budgets-desktop-ui.md is honestly flagged as unsourced. Its 50ms arithmetic was load-bearing and correct. Its "measure a release build, not `tauri dev`" point did not make it into the decision.
- **PM.** Round 1 was written from the goal text without opening the product brief or the research briefs, and used game framing ("proves the fun"). It escalated four questions the board had effectively settled. It left the architecture.md handoff as prose instead of a task.
- **Security-reviewer** did not sit on this board. The security analysis (path allow-list, CSP, removing `plugin-fs`) came from the critic and the architect. There is nothing to judge.

## Follow-ups
- QA: add "measure from a `tauri build` release binary" to the T0b harness and the manual checklist (latency brief, Trade-offs).
- Research: reconcile monaco-in-tauri.md with cached-remote-schema-offline.md (drop `enableSchemaRequest`/`http:default`), and source or remove the "visible section" advice in swagger-ui-react-embed.md.
