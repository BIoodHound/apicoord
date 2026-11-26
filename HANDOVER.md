# APICoord — Handover to Windows

Pausing the Pi-side build. Moving the project to a Windows machine where Tauri can actually build.

## Why we're moving

The pipeline ran agents fine on the Pi, but **Tauri 2.x on Linux needs `webkit2gtk-4.1-dev` + a stack of GTK deps that aren't installed**. Even if the agents produced clean Rust code, every task that calls `cargo check` / `cargo test` fails on this host because Tauri's build won't link. The target is a Windows app; running the build on Windows removes the entire class of host-mismatch escalations we hit.

## Where things stand (frozen 2026-11-26)

- **Phase:** building (paused on usage budget)
- **Total cost so far:** $24.76 across design + partial build
- **Tasks:**
  - **Done (merged on main):** T001 (`ipc-contract` populated from architecture §5), T014 (release runbook).
  - **Escalated (3 attempts, lane / toolchain issues):** T002 (project config, Cargo workspace, CSP, capabilities, vendored schemas).
  - **In progress mid-attempt:** T003 (Rust skeletons), T005 (spikes).
  - **Todo:** T004, T006, T007, T008, T009, T010, T011, T012, T013.
- **Branches:**
  - `main` — scaffold + T001 + T014.
  - `task/t002`, `task/t003`, `task/t004`, `task/t005` — per-task worktrees with the agents' partial work.
  - All pushed to `git@github.com:BIoodHound/apicoord`.
- **Design artefacts (on main):** `product-brief.md`, `design/architecture.md`, `design/ipc-contract.md`, `design/specs/m1-*.md`, `design/council/m1/*`.
- **Open bugs:** `bugs/BUG-006.md` (frontend-dev-tauri filing from a T004 attempt). Review on the new host.

## What survived that you want to use

- `product-brief.md` — the locked scope (3 increments, perf targets, bundled-schemas decision, embedded terminal plan).
- `design/architecture.md` — architect-desktop's rewrite of the Tauri 2.x shape.
- `design/ipc-contract.md` — 9 commands + 2 events, matches architecture §5.
- `design/specs/m1-*.md` — six specs (foundation, menu-lifecycle, file-io, editor, preview, validation).
- `design/council/m1/decision.{html,md}` + round1/round2 position papers — the review board's debate.
- `tests/task_t001/ipc-contract.test.ts` — QA's 8 contract tests.
- `src/ipc/health.ts` + `src-tauri/src/commands/health.rs` — ping round-trip proven on the scaffold.
- `release/DEPLOY.md`, `packaging/CODE_SIGNING.md`, `.github/workflows/release.yml` — T014's release runbook.

## What to do on the Windows machine

1. **Clone fresh** from GitHub: `git clone git@github.com:BIoodHound/apicoord` (or HTTPS with your token).
2. **Install:** Rust stable (rustup), Node 20 LTS, Tauri 2.x CLI (`cargo install tauri-cli --version "^2.0"`), Visual Studio Build Tools (C++ workload) + WebView2 runtime (Edge usually provides it).
3. **One-time bootstrap** that the Pi couldn't finish (T002's deliverable):
   - `npm install` at project root — will restore `package-lock.json` for Monaco, swagger-ui-react, vitest, etc.
   - `cd src-tauri && cargo fetch`
   - Verify `cargo check` passes end-to-end.
4. **Decide the T002 question on Windows** — the Cargo workspace layout (`apicoord-core` sub-crate) and vendored schemas (oas-3.0.json, oas-3.1.json with sha256 recorded) are in the task spec. On Windows this is a 30-min task you can do by hand or dispatch to Claude Code directly; no pipeline needed for a bootstrap of that size.
5. **Continue from main:** T003 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T004 is the dependency order. T013 depends on T012. Each spec is in `design/specs/m1-*.md`.

## Running the pipeline (if you want to)

The pipeline code is at `/home/bananapi/software-pipeline/` on the Pi. To use it from Windows you'd need to copy the whole `software-pipeline/` directory too (or git-clone it if we push it), set up the Python venv, install `claude-agent-sdk`, and point `projects/apicoord/` at the clone.

**Honest take:** for a ~2k-LOC Windows desktop app, direct Claude Code with the brief + specs loaded will probably be faster and cheaper than running the full pipeline on Windows. The pipeline shines on projects with lots of parallel tasks where lessons compound across increments. apicoord fits into one direct-with-you session once the Pi-side mismatches are gone.

## Pipeline's performance here (lessons we keep)

- Context repo (base + patches + cacheable prefix) halved the per-task cost.
- Sub-team routing works once the stack parser is forgiving.
- The 85% safe-pause works; exit code 2 on pause confuses systemd but the pipeline itself is correct.
- Lane violations on per-task escalation notes are a recurring foot-gun (agents write to their own review in the course of reporting a problem). Needs an explicit allow-rule for `reviews/<task>-*` in every agent's owns.
- Trying to build cross-platform binaries on the wrong host is a losing game. Match the pipeline host to the project's build host.

## Services and processes left behind on the Pi

- `~/.config/systemd/user/apicoord-run.service` — stopped and disabled.
- Docker containers `brief-server`, `cf-apicoord` — removed.
- No orphan processes.

## Operator

Leo. 2026-11-26.
