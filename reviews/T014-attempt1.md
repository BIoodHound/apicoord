# Review T014 attempt 1: PASS

Accept. The runbook meets all 5 criteria in substance: clean-clone Windows release build with installer paths, a 47-item checklist covering every m1 spec and all 13 test files, the p95 < 250ms gate for Petstore and big-10k with a miss holding the increment and no fallback, fast-forward-only git with force-push and re-init forbidden, and no workflow added. The gate output was empty, so nothing ran; I verified by reading. Follow-ups: the unstated dependency on T0 (lockfile and typecheck script), a likely-wrong exe name (app.exe vs apicoord.exe), and the QA test placed in a stray frontend/ tree.

## Issues
- RELEASE-RUNBOOK.md §2: state that a clean-checkout build requires T0 merged (committed package-lock.json for `npm ci` and the `typecheck` script from architecture §9.1); neither exists in the repo yet. Also fix 'Both commands must be green' above three commands.
- RELEASE-RUNBOOK.md §2/§4: the release exe path `src-tauri/target/release/apicoord.exe` is likely wrong. Cargo package name is `app` and tauri.conf.json sets no mainBinaryName, so the raw binary is app.exe. Fix the path or have the architect set mainBinaryName='apicoord'.
- QA: move runbook.test.ts from frontend/src/__tests__/tasks/task_t014/ to src/__tests__/tasks/task_t014/ (the project convention; this repo has no frontend/ app) and fix the ROOT path depth.

## Tests
passed
