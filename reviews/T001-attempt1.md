# Review T001 attempt 1: PASS

After the ownership-hook fix, the architect replaced ipc-contract.md with the title plus architecture.md §5, exactly as written. I checked by reading both files: 9 commands, 2 events, the path argument only on open_recent with the allow-list rule stated, and no remote schema fetch in architecture.md. All 4 criteria pass. The tests are good document-contract checks, but the gate didn't actually run them (B4); evidence is the implementer's scratch run plus my own file check. Only the contract file changed, and it's in the architect's lane.

## Issues
- Non-blocking: the gate test run was empty again because node_modules is missing (B4). The 8 T001 tests have only run in the implementer's scratch /tmp install; T0 must run npm install so they run in the real gate.
- Non-blocking (architect): architecture.md header note (line 6), §0 B2 and D16 still describe B2 / the ipc-contract replacement as pending; update them outside §5 in the next architect task.
- Non-blocking (qa-engineer): move frontend/src/__tests__/tasks/task_t001/ipc-contract.test.ts to src/__tests__/tasks/task_t001/ once the QA lane is re-mapped, because the repo has no frontend/ dir.

## Tests
passed
