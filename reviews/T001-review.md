# T001 review: ipc-contract.md ← architecture.md §5

## Attempt 3 of 3: **escalate**

| # | Criterion | Result |
|---|---|---|
| 1 | ipc-contract.md is §5 verbatim | FAIL. I checked: the file is still the 29-line placeholder. |
| 2 | 9 commands, 2 events | FAIL. Only `ping` is listed, and there are no events. |
| 3 | Only open_recent takes a path | FAIL. The rule is not in the contract file. |
| 4 | No remote schema fetch in architecture.md | PASS, checked by grep and confirmed by both the architect and QA. |

**This is the third identical failure.** B2 (the ownership hook blocks the architect from writing `design/ipc-contract.md`) and B4 (no node_modules) were still unfixed when attempt 3 was dispatched, even though `T001-escalation.md` asked for them to be fixed first. No agent can close this task. Closing it takes one file copy and one `npm install`.

**A likely cause of B2:** the placeholder's own header says *"The architect-desktop owns this file"*. The ownership map probably gives the file to the role `architect-desktop`, but the task was dispatched to `architect`. That is a role-name mismatch in the lane map. The architect's work is not at fault.

**Owner conduct:** correct again. The architect did not get around the hook, made no edits it didn't need, re-checked criterion 4, and gave an exact copy recipe.

**Test quality:** no tests ran. The "PASSED" run had empty output, and QA correctly treated it as no evidence. The 8 tests in `ipc-contract.test.ts` have not run yet in any attempt.

**Lane / scope:** no files changed and no violations.

See `T001-escalation.md` for the operator decisions.

---
## Attempt 2 (summary)
Return-with-issues, with a recommendation to escalate before attempt 3. Same three failures for the same reasons (B2, B4). The §5 opening line was finalised in architecture.md.

## Attempt 1 (summary)
Return-with-issues. Same three criteria failed (B2 hook block, B4 no node_modules). The architect correctly did not get around the hook.
