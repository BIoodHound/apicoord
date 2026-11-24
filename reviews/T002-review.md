# T002 review: T0 project config, Cargo workspace, CSP, capabilities, vendored schemas

**DO NOT RE-DISPATCH. Attempt budget exhausted (3 of 3). Verdict: escalate.** Operator decisions B1–B4 in `T002-escalation.md` must be made before anyone touches T002 again.

## Correctness vs spec (m1-foundation §9.1–9.5), attempt 3
| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | npm install, lock committed | FAIL | no package-lock.json or node_modules; plugin-fs still in package.json |
| 2 | `npm run typecheck` runs | FAIL | no typecheck script |
| 3 | cargo test runs ≥1 test | FAIL | no `src-tauri/core` or workspace; cargo not installed (B3) |
| 4 | `npm test -- --run` runs ≥1 test | FAIL | vitest not installed; `tests/task_t002/` does not exist (the task text says otherwise) |
| 5 | Perms only core:default, set-title, window-destroy | FAIL | dialog:allow-open/save still granted; window-lifecycle.json missing |
| 6 | Strict CSP | FAIL | `"csp": null` |
| 7 | Schema sha256 per §9.5 | FAIL | not vendored (upstream hashes re-checked read-only only) |

0 of 7 met. The "PASSED" run had empty output and counts as not run (QA applied S016 correctly).

## Root cause
Same as attempts 1 and 2: the hook applies a Spring lane map to a Tauri repo (B2), and the stack, host, and deps decisions (B1, B3, B4) are still open. Attempt 3 went out with **none** of the preconditions met, even though the attempt-2 review said not to dispatch. This is an orchestration failure, not the owner's. All three attempts were spent on a blocker that no agent lane can clear.

## What attempt 3 added
- architecture.md §0.2 steps 4/6/7 now give full file contents (tauri.conf.json, src-tauri/Cargo.toml, lib.rs). Every JSON/TOML block was parse-checked and checked against the CSP allow-list. Applying (2b) is now a mechanical step.
- `http://ipc.localhost` in connect-src is Tauri's IPC transport, not a remote origin. I accept it for C6, but QA's C6 test must allow-list exactly this token and nothing else.
- The task text claimed `tests/task_t002/` exists. That was false, and the architect correctly called it out.

## Test quality
No tests are in the repo yet. QA's drafted files (in the bug report) assert on the criteria: exact 3-permission set, CSP tokens in both `csp` and `devCsp`, sha256 values, and test count. Re-review them once they are placed.

## Lane discipline / scope
Architect: clean (only `design/architecture.md`, no shell bypass). QA: clean (no tests in uncollected paths, no duplicate bug).
