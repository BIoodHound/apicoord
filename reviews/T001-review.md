# T001 review: ipc-contract.md ← architecture.md §5

## Re-dispatch after escalation, attempt 3 of 3: **accept**

- I re-read both files. `design/ipc-contract.md` is the title plus architecture.md lines 122–210 (§5) verbatim: 9 commands, 2 events, `{code,message}` errors, and only `open_recent` takes a path. architecture.md has `enableSchemaRequest: false` everywhere, D2 says schemas are bundled, and the only URLs are for the authoring-time download. All 4 criteria pass.
- The attempt-2 issue is resolved: `reviews/T001-escalation.md` is back to the orchestrator's text (it is listed in files_changed only because of the revert). Architects must not edit orchestrator-owned review files.
- The gate is still empty ("PASSED", no output) because B4 (node_modules) and B1 (`cd backend && mvn`) are unfixed. I'm accepting on direct inspection of the files, not on the gate run. T0 must fix B1/B4.
- The follow-ups below still stand: the stale B2/D16 wording in architecture.md and the test-file location.

## Re-dispatch after escalation, attempt 1 of 3: **accept**

The ownership-hook fix (B2) was applied before this attempt, so the architect could finally write the file.

| # | Criterion | Result |
|---|---|---|
| 1 | ipc-contract.md is §5 verbatim | PASS. I checked: the file is the title line plus `## 5.` through to just before `## 6.`. That includes the §5 intro line ("mirrors this section verbatim (copied in T001)"). QA's diff shows only a trailing blank line. |
| 2 | 9 commands, 2 events | PASS. The 9 command rows are ping, open_spec_dialog, open_recent, save_spec, save_spec_as, close_document, list_recent, get_schema and exit_app. The 2 events are menu://action and recent://changed. |
| 3 | Only open_recent takes a path | PASS. The Args column has `path` only on `open_recent`, and the allow-list rule is stated in the file. |
| 4 | No remote schema fetch in architecture.md | PASS. `enableSchemaRequest: false` is set everywhere, schemas load with `include_str!`, and the only remote URLs are the authoring-time spec.openapis.org sources. |

**Test quality:** `ipc-contract.test.ts` (8 tests) asserts directly on each criterion and on two edge cases: the placeholder is gone, and no unexpected remote URLs appear. These are good document-contract tests. **However, the gate run was again empty ("PASSED" with no output)**, because B4 (`node_modules` missing) is still unfixed. The only evidence the tests pass is the implementer's scratch vitest install in /tmp. The file checks are simple, and I verified them by reading both files myself, so I'm accepting on that basis. B4 must still be fixed in T0.

**Lane / scope:** only `design/ipc-contract.md` changed, which is in lane. The architect correctly ran tests from /tmp so the worktree's lockfile didn't change.

**Follow-ups (non-blocking, architect):**
- architecture.md §0 B2 and the header note (line 6) still describe B2 as blocking. D16's wording ("until ipc-contract.md is replaced") is now satisfied. Update these outside §5 in the next architect task.
- The test file lives in `frontend/src/__tests__/tasks/task_t001/`, but this repo has no `frontend/` dir. Move it to `src/__tests__/tasks/task_t001/` when the QA lane is re-mapped (the file header already says this).

---
## Original run, attempt 3 of 3 (summary): escalate
All three file criteria failed, for the same reason as attempts 1 and 2: the ownership hook blocked the architect (role-name mismatch `architect-desktop` vs `architect`). See `T001-escalation.md`. The hook fix this time confirmed that diagnosis.
