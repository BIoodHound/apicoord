# T001 escalation note (attempt 3 of 3: budget exhausted)

## What the owner tried
- **Attempt 1:** The architect edited architecture.md to say ipc-contract.md mirrors §5. The write to `design/ipc-contract.md` was blocked by the ownership hook (B2). No tests ran because node_modules is missing (B4).
- **Attempt 2:** The architect finalised the §5 opening line, added copy steps to the B2 row, and checked criterion 4 with node. The write was blocked again (B2). Tests still couldn't run (B4).
- **Attempt 3:** Dispatched before either blocker was fixed. The write was blocked again (B2). Criterion 4 was re-verified, and architecture.md needed no changes. Tests couldn't run (B4).

## What went wrong
At every attempt the cause was outside the owner's lane. The pre-emptive note after attempt 2 asked for B2 and B4 to be fixed before attempt 3, but attempt 3 went out without those fixes. Criterion 4 passes. Criteria 1–3 depend on one file copy that the hook forbids.

**Likely root cause of B2:** the placeholder's header says *"The architect-desktop owns this file"*. The ownership map seems to give `design/ipc-contract.md` to a role called `architect-desktop`, not `architect`.

## What the operator needs to decide
1. **B2 (lane map):** Either rename or merge `architect-desktop` → `architect` in the ownership map (recommended, because later tasks will edit this contract too), or do the copy yourself as the operator or orchestrator:
   `{ printf '# APICoord — IPC contract\n\n'; awk '/^## 5\. /{f=1} /^## 6\. /{f=0} f' design/architecture.md; } > design/ipc-contract.md`
2. **B4 (deps):** Run `npm install` once in `worktrees/apicoord/t001/frontend`, and choose which lane or step does this for future worktrees.
3. **Close-out:** After 1 and 2, run `cd frontend && npx vitest run src/__tests__/tasks/task_t001`. Accept T001 only if all 8 tests report with non-empty output. Re-dispatching to the architect is not needed if the operator does the copy.
4. **Process:** When an escalation note lists operator prerequisites, the orchestrator should not dispatch the next attempt until they are done.
