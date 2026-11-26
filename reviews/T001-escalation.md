# T001 escalated: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes

Owner: architect · attempts: 3 · written 2026-11-24 21:08

## What was asked

First build task (operator procedural note). Copy architecture.md §5 verbatim into design/ipc-contract.md (9 commands, 2 events, {code,message} errors, allow-list rule: only open_recent takes a path). Confirm architecture.md reflects m1 decisions (bundled schemas, no remote fetch).

- ipc-contract.md matches architecture.md §5 verbatim
- Contract lists exactly 9 commands and 2 events
- Only open_recent accepts a path argument
- architecture.md has no remote schema fetch

## Why it was rejected last

- ESCALATE (attempt 3/3): design/ipc-contract.md is still the 29-line placeholder; criteria 1-3 fail and criterion 4 passes. The root cause is outside the owner's lane.
- B2: the ownership hook blocks the architect from writing design/ipc-contract.md. The placeholder header names 'architect-desktop' as owner, which points to a role-name mismatch in the ownership map. Fix the map (architect-desktop -> architect) or have the operator/orchestrator do the copy with the awk recipe in reviews/T001-escalation.md.
- B4: node_modules is missing, so the 8 tests in ipc-contract.test.ts have never run in any attempt. Run npm install in worktrees/apicoord/t001/frontend, then `npx vitest run src/__tests__/tasks/task_t001` and require 8/8 with non-empty output before accepting.
- Process: attempt 3 was dispatched without the operator prerequisites from the earlier escalation note. Do not re-dispatch while an escalation note's prerequisites are still open.

## Worth knowing

- The plan had architect change files it doesn't own: projects/apicoord/design/ipc-contract.md. If that's what blocked it, widen `owns:` in .claude/agents/architect.md or give the task to another owner, then retry.

## Where the work is

branch `task/t001` of projects/apicoord, commit 409fe4f. Its tests: projects/apicoord/tests/task_t001.

## The agent's assumptions

- Writing to ipc-contract.md with shell redirection to get around the ownership hook is not allowed; the hook's message says to hand the change to the file's owner instead.
- architecture.md §5 is final as it stands and is the text to copy; no edits were needed for criterion 4.
- Attempt 3 was dispatched before the operator decisions in reviews/T001-escalation.md (B2 lane map, B4 dependency install) were carried out.

## Reviews

- projects/apicoord/reviews/T001-attempt1.md
- projects/apicoord/reviews/T001-attempt2.md
- projects/apicoord/reviews/T001-attempt3.md

## History

- 21:01 **qa-engineer** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:02 **qa-engineer** end: done
  - last words: "I wrote 8 tests for T001's four criteria in one file. They run, and they fail where they should: 6 fail against the current `ipc-contract.md`. The 2 tests for criterion 4 already pass, because `architecture.md` already has no remote schema fetch. That task is a confirmation, so this is expected. The"
- 21:02 **architect** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:03 **architect** end: done
  - last words: "I could only do half of T001. `architecture.md` already meets the m1 decisions (criterion 4), but I couldn't replace `design/ipc-contract.md`: the file-ownership hook rejected my write. Criteria 1–3 are still unmet, and the 6 contract tests in `ipc-contract.test.ts` will fail until someone who owns "
- 21:03 **orchestrator** gate: T001 passed the acceptance-review gate
- 21:03 **qa-engineer** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:04 **qa-engineer** end: done
  - last words: "Criteria 1–3 fail and criterion 4 passes. `design/ipc-contract.md` was never replaced. It is still the 29-line placeholder with only `ping` and no events."
- 21:04 **auditor** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:04 **auditor** end: done
  - last words: "T001 fails on attempt 1: three of the four acceptance criteria are not met because `design/ipc-contract.md` was never replaced."
- 21:04 **architect** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:05 **architect** end: done
  - last words: "I couldn't finish T001: the ownership hook blocked my write to `design/ipc-contract.md` again, so the file is still the 29-line placeholder and BUG-001 is still open. The 6 contract tests will fail until someone else does the copy."
- 21:05 **orchestrator** gate: T001 passed the acceptance-review gate
- 21:05 **qa-engineer** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:06 **qa-engineer** end: done
  - last words: "T001 fails: `design/ipc-contract.md` is still the old 29-line placeholder, so criteria 1–3 are not met. Criterion 4 passes."
- 21:06 **auditor** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:06 **auditor** end: done
  - last words: "T001 fails again on attempt 2, for the same reason as attempt 1. `design/ipc-contract.md` is still the old 29-line placeholder. Criteria 1–3 fail, and only criterion 4 passes."
- 21:06 **architect** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:07 **architect** end: done
  - last words: "I couldn't finish T001: the hook blocked my write to `design/ipc-contract.md` again, so criteria 1–3 still fail. Neither precondition from the last rejection was fixed before this attempt: the lane map (B2) is unchanged, and `node_modules` is still empty (B4)."
- 21:07 **orchestrator** gate: T001 passed the acceptance-review gate
- 21:07 **qa-engineer** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:07 **qa-engineer** end: done
  - last words: "`ipc-contract.md` is still the old 29-line placeholder, so criteria 1–3 fail. Criterion 4 passes. I couldn't run the gate tests because `frontend/node_modules` doesn't exist (B4). The "PASSED" run with empty output counts as not run, so I'm not using it as evidence."
- 21:07 **auditor** start: Task T001: Replace ipc-contract.md with architecture.md §5 and apply m1 design notes
- 21:08 **auditor** end: done
  - last words: "T001 has failed its last attempt (3 of 3) and I'm escalating it to you. No agent can finish it; it needs one file copy and one `npm install` that only you or the orchestrator can do."

## Your call

- Retry: fix what blocked it, then `python -m orchestrator retry T001 --notes "..."` and `run`. The retry continues from the work above.
- Rescope or split it: tell the producer what to change.
- Drop it: say so in the milestone review; its tests stay parked.
