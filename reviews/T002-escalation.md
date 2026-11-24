# T002 escalation: operator decisions needed (FINAL, after attempt 3 of 3)

**Attempt 3 (final):** T002 was dispatched again with decisions 1–4 still open, and it failed identically: hook rejection on package.json, 0/7 criteria met. **No attempts remain.** T002 is now a hard escalation, and no agent re-dispatch can succeed until B2 is resolved. The deliverable recipe is complete. architecture.md §0.2 steps 1–10 now give full, parse-checked contents for every file, including tauri.conf.json, src-tauri/Cargo.toml and lib.rs. QA's gate tests are in `bugs/t002-qa-lane-blocked-gate-tests-undeliverable.md`. Note that `tests/task_t002/` does **not** exist, despite the task text. Option (2b) is now a mechanical step plus `npm install` and `curl -o` for the schemas.

**Process issue for the operator:** the attempt-2 review's "do not dispatch" note was ignored. The orchestrator should hold tasks whose review says so until the operator decides. Otherwise the retry budget goes to blockers that no lane can clear.

**Attempt 2 update:** T002 was re-dispatched without any of decisions 1–4 below being made, and it failed identically: the hook rejected package.json and 0/7 criteria were met. The architect replaced the recipe with architecture.md **§0.2**, a complete file set with full contents mapped to C1–C7. §0.1's advice to apply §12's `lib.rs` was wrong, because that version doesn't compile at T002. Use §0.2 for option (2b). Attempt 3 is the last. Dispatching it before the operator decides will burn it and force a hard escalation with nothing new learned.

Filed early on purpose. Every failure has a root cause outside the owner's lane, so attempts 2 and 3 would fail the same way.

## What was tried
- **T001:** found B1–B4 and recorded them in architecture.md §0.
- **T002 attempt 1:** the architect tried to write `package.json` and `vite.config.ts`, and the hook rejected both, even for scratch copies in /tmp. QA tried `tests/task_t002/`, `tests/shared/` and `src/__tests__/tasks/task_t002/`, and the hook rejected all three. Nothing was applied. The architect pre-verified the inputs and left an apply-verbatim recipe in architecture.md §0.1 (hashes, npm versions, tsc/vitest config, minimal core `lib.rs`). QA left its gate tests in `bugs/t002-qa-lane-blocked-gate-tests-undeliverable.md`.

## What the operator must decide
1. **Stack (B1):** set `PIPELINE_STACK=rust-tauri+ts-react` for apicoord? The test gate currently `cd`s into backend/ and frontend/, which don't exist.
2. **Lanes (B2), pick one:**
   - (a) Re-map the architect and qa-engineer lanes to the architecture.md §2 table, then re-dispatch T002.
   - (b) Authorize the orchestrator, which has no lane, to apply architecture.md §0.2 steps 1–10 and QA's three files verbatim, then send T002 straight to QA verification.
3. **Host (B3):** install rustup and the Tauri Linux prerequisites on the Pi? Otherwise accept C3 as `cargo test -p apicoord-core` (tauri-free), or run C3 on another host.
4. **Deps (B4):** confirm that T0's owner (or the orchestrator) runs `npm install` with network access. This is the only network step and happens at build time, so it doesn't conflict with K006's no-network rule for the app.

Recommendation: (1) yes. (2b) for T002 only, because it is fastest and the recipe is verified; then do (2a) before any feature task. (3) install rustup now and use the core-only fallback until webkit is installed.
