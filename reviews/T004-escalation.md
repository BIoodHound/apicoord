# T004 escalated: T0: TS skeletons (IPC types, store, fileActions, parse protocol, perf marks)

Owner: frontend-dev · attempts: 3 · written 2026-11-25 15:38

## What was asked

Create src/ipc/types.ts from §5.3, typed invoke wrappers, Zustand store skeleton, fileActions skeleton, parse worker message protocol types, and perf marks apicoord:ks / apicoord:commit helpers.

- npm run typecheck passes
- IPC types match ipc-contract.md
- Perf mark helpers emit apicoord:ks and apicoord:commit
- At least one vitest passes

## Why it was rejected last

- You changed files you don't own: worktrees/apicoord/t004/tsconfig.tsbuildinfo. Revert those changes and describe what you need from their owner in your summary instead.

## Worth knowing

- The plan had frontend-dev change files it doesn't own: projects/apicoord/src/ipc/types.ts, projects/apicoord/src/ipc/client.ts, projects/apicoord/src/store/index.ts, projects/apicoord/src/lib/fileActions.ts, projects/apicoord/src/lib/perf.ts, projects/apicoord/src/workers/parseProtocol.ts. If that's what blocked it, widen `owns:` in .claude/agents/frontend-dev.md or give the task to another owner, then retry.
- The acceptance-review gate failed 3 time(s). The agent's last words are in the history below.

## Where the work is

branch `task/t004` of projects/apicoord, commit 9e9ba5e. Its tests: projects/apicoord/tests/task_t004.

## The agent's assumptions

- zustand 5.1.0 is already in node_modules but not declared in package.json; the architect adds the dependency (§9.1) so a clean npm install keeps it
- The `call` helper lives in its own src/ipc/invoke.ts so the command modules export only command wrappers (the task test calls every exported function in them)
- Rust drives menu enable/disable; the webview only sets the window title and destroys the window

## Reviews

- none

## History

- 15:32 **qa-engineer** start: Task T004: T0: TS skeletons (IPC types, store, fileActions, parse protocol, perf marks)
- 15:34 **qa-engineer** end: done
  - last words: "I've written 8 tests for T004 before the frontend-dev starts. All 8 fail right now, each for the right reason: the skeleton files don't exist yet (`src/ipc/types.ts`, `src/ipc/{file,recent,schema,app,events}.ts`, `src/perf/marks.ts`, `src/state/store.ts`, ...) and `package.json` has no `typecheck` s"
- 15:34 **frontend-dev-tauri** start: Task T004: T0: TS skeletons (IPC types, store, fileActions, parse protocol, perf marks)
- 15:37 **frontend-dev-tauri** violation: changed worktrees/apicoord/t004/package-lock.json without owning it
- 15:37 **frontend-dev-tauri** violation: changed worktrees/apicoord/t004/package.json without owning it
- 15:37 **frontend-dev-tauri** end: done
  - last words: "I've added the TypeScript skeletons: the IPC types, typed wrappers for every command, the store, the file-action dispatcher, the parse-worker message types and the perf marks. `npm run typecheck`, `npm run build` and the full vitest suite (22 tests) all pass, including QA's 8 T004 tests."
- 15:37 **orchestrator** gate: T004 failed the acceptance-review gate; back to frontend-dev
- 15:37 **frontend-dev-tauri** start: Task T004: T0: TS skeletons (IPC types, store, fileActions, parse protocol, perf marks)
- 15:37 **frontend-dev-tauri** violation: changed worktrees/apicoord/t004/package-lock.json without owning it
- 15:37 **frontend-dev-tauri** violation: changed worktrees/apicoord/t004/package.json without owning it
- 15:37 **frontend-dev-tauri** violation: changed worktrees/apicoord/t004/tsconfig.tsbuildinfo without owning it
- 15:37 **frontend-dev-tauri** end: done
  - last words: "I've reverted the files I don't own. All my TypeScript skeleton work passes its tests, but one QA test will keep failing until the architect edits `package.json`."
- 15:37 **orchestrator** gate: T004 failed the acceptance-review gate; back to frontend-dev
- 15:37 **frontend-dev-tauri** start: Task T004: T0: TS skeletons (IPC types, store, fileActions, parse protocol, perf marks)
- 15:38 **frontend-dev-tauri** violation: changed worktrees/apicoord/t004/tsconfig.tsbuildinfo without owning it
- 15:38 **frontend-dev-tauri** end: done
  - last words: "I've reverted the three files I don't own, and everything I own is done. One of the task's 8 tests still fails: `npm_run_typecheck_is_defined_as_tsc_b_and_passes`. It needs a `typecheck` script in `package.json`, which only the architect can add."
- 15:38 **orchestrator** gate: T004 failed the acceptance-review gate; back to frontend-dev

## Your call

- Retry: fix what blocked it, then `python -m orchestrator retry T004 --notes "..."` and `run`. The retry continues from the work above.
- Rescope or split it: tell the producer what to change.
- Drop it: say so in the milestone review; its tests stay parked.
