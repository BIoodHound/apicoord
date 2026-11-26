# T014 review — Windows release build + manual QA runbook

**Verdict: accept, with 3 small follow-ups (fold them into the next packaging touch; no re-dispatch needed).**
Attempt 1/3. Owner: release-engineer. Deliverable: `packaging/RELEASE-RUNBOOK.md`.

## Gate evidence
"Final test run (PASSED)" had empty output, so the gate didn't run (no node_modules, no cargo on host: B3/B4).
I read the runbook and the test file myself.

## Criteria
| # | Result | Notes |
|---|---|---|
| 1 clean-checkout release build | pass* | Clone → `npm ci` → gate → `cargo tauri build` (no `--debug`), with MSI/NSIS artefact paths and Windows prerequisites. *See issues 1–2. |
| 2 checklist covers every m1 area | pass | 47 tickable items across all six specs, with all 13 fixtures named. Each spec's acceptance bullets map to an item: byte-identical round-trip, majority EOL, override + undo, stale/empty-invalid, 0 markers on petstore, schema restore, Recent de-dup, three-way prompt, one `save_spec` per Ctrl+S, the three spikes. |
| 3 perf gate | pass | p95 < 250ms for Petstore **and** big-10k, measured separately on the release build, using `apicoord:ks`/`apicoord:commit` marks. A miss holds the increment, with no fallback (matches D3/§6.3). |
| 4 git | pass | `--ff-only` merge and pull. Force-push, `git init`, deleting `.git` and hard reset to the remote are all prohibited. |
| 5 no workflow | pass | No `.github/` in the worktree. |

## Issues (follow-ups)
1. **Unstated dependency on T0.** `npm ci` needs a committed `package-lock.json`, and `npm run typecheck` needs the script from §9.1. Neither exists in the repo today, so a clean checkout fails at step 1. The runbook should state "requires T0 merged (lockfile + typecheck script)". The prose also says "Both commands must be green" above three commands.
2. **Binary path is likely wrong.** `src-tauri/Cargo.toml` has `name = "app"`, and no `mainBinaryName` is set, so the raw release exe is `target/release/app.exe`, not `apicoord.exe`. The perf section points at the wrong file. Either fix the path, or have the architect set `mainBinaryName: "apicoord"` / rename the crate. Until then, measure on the installed MSI build, which the runbook already allows.
3. **Test location.** QA's test lives in `frontend/src/__tests__/tasks/task_t014/`. This repo has no `frontend/` app; the convention is `src/__tests__/tasks/task_<id>/` at the root (architecture §0 B1). Root vitest has no `include`, so the test should still be collected, but it creates a stray tree. QA should move it when the gate first runs.

## Test quality
Good for a document task. The tests assert on criteria content rather than file existence alone: fixtures, spec-area terms, the forbidden 400ms fallback, force-push/reinit commands inside code fences, and a ≥25 checklist count. One weakness: the tests can't catch factual errors such as issue 2.

## Lane / scope
In lane, with one file changed. No scope creep. The memory and cold-start items go slightly past m1 acceptance but are brief NFRs, which is fine.
