# APICoord — Architecture

> Owned by the architect. Everyone else reads it to know where things go.
> State: **Increment 1 (M1) — "a working split view" — BUILD, T002 (T0) attempt 4: architect-lane part of §0.2 applied (2026-11-25); see §0.3 for what still needs other owners.**
> Specs `design/specs/m1-*.md` (operator-approved), council decision `design/council/m1/decision.md`,
> operator answers Q1–Q7 folded into §13. §5 is the **authoritative IPC contract**; `design/ipc-contract.md`
> holds a verbatim copy of §5 (T001, D16) and must be updated in the same task whenever §5 changes.
> Note on vocabulary: this is a Tauri desktop app, not a game. "Scene tree" = React component tree (§3),
> "autoloads" = app-lifetime singletons (§4), "gameplay ↔ UI signals" = Rust ↔ webview commands/events (§5),
> "physics layers" = trust boundaries (§8), "input actions" = shortcuts (§7).

---

## 0. Pipeline blockers — fix before T0 (operator / orchestrator)

These are outside every agent's lane, and each one blocks T0.

| # | Problem (verified 2026-11-24) | Fix |
|---|---|---|
| B1 | The configured test gate is `cd backend && mvn -q test` / `cd frontend && npm test`. **Neither directory exists**; the gate fails on `cd`. Cause: `PIPELINE_STACK` defaults to `java-spring+ts-react` (`orchestrator/runner_adapter.py`). | Run apicoord with `PIPELINE_STACK=rust-tauri+ts-react`. That adapter already exists and runs `cd src-tauri && cargo test` + `npm test -- --run` at the project root, with task tests at `src-tauri` test names `task_<id>` and `src/__tests__/tasks/task_<id>/`. |
| B2 | The file-ownership hook uses the Spring lane map (`backend/pom.xml`, `frontend/package.json`, `api-contract.md`). In this repo the architect can't write `package.json`, `tsconfig.json`, `vite.config.ts`, `src-tauri/Cargo.toml`, `tauri.conf.json`, `capabilities/*`, `src-tauri/src/lib.rs` or `design/ipc-contract.md`, although §2 assigns them to the architect. | Re-map the architect lane for the tauri stack (the §2 table). Until then, **this document is the authoritative IPC contract (§5)**, and T0's owner applies the config deltas in §9 verbatim. T001 was still blocked on 2026-11-24 (attempt 2). Whoever is allowed to write `design/ipc-contract.md` replaces it with the title `# APICoord — IPC contract`, a blank line, then the output of `awk '/^## 5\. /{f=1} /^## 6\. /{f=0} f' design/architecture.md`. |
| B3 | The gate host (Raspberry Pi, linux-arm64) has **no `cargo`** and no `webkit2gtk-4.1`. Any `cargo test` that builds the `tauri` crate fails on this host. | Install rustup + Tauri's Linux prerequisites (`libwebkit2gtk-4.1-dev`, `libsoup-3.0-dev`, `libjavascriptcoregtk-4.1-dev`, `librsvg2-dev`, `build-essential`, `pkg-config`). Independently, §2 puts all logic in a tauri-free crate, `apicoord-core`, so `cargo test -p apicoord-core` works on any host with only rustup. |

| B4 | `node_modules/` is absent, so `npm test -- --run` fails with `vitest: not found`. The architect may not run `npm install`. | T0 (per m1-foundation, "a build with the pinned deps succeeds") runs `npm install` after applying §9.1 and commits `package-lock.json`. |

Gate result, re-run 2026-11-24 by the architect: `cd backend && mvn -q test` → `cd: backend: No such file or directory`;
`npm test -- --run` → `vitest: not found` (B4); `cargo` is not installed (B3). **Nothing ran. The gate is red for environmental reasons, not code.**
The only existing tests are `src/__tests__/App.test.tsx` (1 test) and `commands/health.rs::ping_returns_ok`.

### 0.1 T002 status (2026-11-24): blocked by B2, nothing applied

T002 was assigned to the architect, but the hook still applies the Spring lane map. It rejected `Write` on
`package.json` and `vite.config.ts` in the worktree, and on scratch copies in `/tmp`. The architect may write only
`design/architecture.md`, `design/api-contract.md`, `backend/**` and `frontend/**`. **No §9 delta is applied.**
QA was blocked the same way. Its gate tests exist only as text in `bugs/t002-qa-lane-blocked-gate-tests-undeliverable.md`,
and `tests/task_t002/` does not exist.

Checked by the architect before being blocked, so the owner can apply §9 verbatim:
- **§9.5 schema hashes:** downloaded both URLs. `oas-3.0.json` (35,752 B, LF, trailing newline) hashes to `7a0db731…822cf`,
  and `oas-3.1.json` (33,992 B) hashes to `da01ba28…14ed0`, matching §9.5 exactly. Vendor them with
  `curl -sSL -o` (byte-exact). Do not retype them through an editor.
- **§9.1 versions:** all resolve on npm today: monaco-editor 0.54.0, monaco-yaml 5.5.1 (peer `monaco-editor >=0.36`),
  swagger-ui-react 5.36.0 (peer react `>=16.8 <20`), @monaco-editor/react 4.7.0, zustand 5.1.0, yaml 2.9.1,
  @types/swagger-ui-react 5.18.0, react 18.3.1.
- **§9.2:** `tsc -b --force` exits 0 with `types: ["vite/client", "vitest/globals", "@testing-library/jest-dom"]`.
  `vitest --run` passes App.test.tsx. In vite.config.ts, import `defineConfig`/`configDefaults` from `vitest/config` and set
  `test.exclude: [...configDefaults.exclude, 'tests/fixtures/**']`. Without the spread, vitest stops excluding `node_modules`.
- **QA's C2 test** imports `node:*` from `tests/`. That is fine, because tsconfig `include: ["src"]` keeps it out of `tsc -b`.

To unblock: either re-map the lanes (B1/B2), or have the orchestrator, which has no lane, apply **§0.2 verbatim**
(this is the full T002 file set, and it supersedes the prose in §9 and §12 for T002). It should also place QA's three files from the bug verbatim,
then run `npm install`. **Do not apply §12's `lib.rs` in T002.** It references `menu`, `state` and `apicoord_core::{schemas,mru}`,
which don't exist yet, so it would not compile. Feature tasks grow into §12.

**Attempt 2 (2026-11-24):** still blocked. The hook rejected `Edit` on `package.json` with the same Spring lane list
(`frontend/package.json`, `backend/pom.xml`, …). B1–B4 are unchanged: `cargo` is still absent, and so are `node_modules`
and `tests/task_t002/`. The architect re-verified both schema sha256 values against upstream (streamed, nothing written)
and re-resolved every §9.1 version on npm (all still resolve as listed). It then wrote §0.2.

**Attempt 3 (2026-11-24):** still blocked. The architect's first action was a `Write` to `package.json`, which the hook rejected
with the same Spring list (`frontend/package.json`, `backend/pom.xml`, …). The task text says QA's tests are already in
`tests/task_t002/`, but **that directory does not exist**: the tests are still only text in the bug file. Re-verified today:
both schema sha256 values match upstream (streamed, nothing written), every §9.1 pin resolves (monaco-editor 0.54.0,
monaco-yaml 5.5.1, swagger-ui-react 5.36.0, @monaco-editor/react 4.7.0, react 18.3.1, @types/swagger-ui-react 5.18.0),
`cargo` is still absent (B3), and so is `node_modules` (B4). Steps 4, 6 and 7 of §0.2 are now complete file contents instead of
edit instructions, so they can be applied mechanically. **Re-dispatching T002 to the architect cannot succeed until B2 is re-mapped.**

### 0.3 T002 attempt 4 (2026-11-25): what was applied, and what still needs other owners

The re-mapped architect lane is `design/{architecture,ipc-contract}.md`, `package.json`, `tsconfig.json`, `vite.config.ts`,
`src-tauri/{Cargo.toml,tauri.conf.json,build.rs}` and `src-tauri/capabilities/**`. It does **not** cover `src-tauri/src/lib.rs`,
`src-tauri/core/**` or `tests/**`; the hook rejected writes to those again.

**Applied by the architect:** §0.2 steps 1–6 and 10 (package.json, tsconfig, vite.config, tauri.conf.json CSP + `label: main`,
both capability files, src-tauri/Cargo.toml with the workspace), plus `npm install`, which writes `package-lock.json` (commit it, not
`node_modules`), and `ipc-contract.md` = §5. Results: `tsc -b` → 0, and `npm test -- --run` → 1/1 (App.test.tsx). Resolved versions
match the pins: react / react-dom 18.3.1, monaco-editor 0.54.0, monaco-yaml 5.5.1, swagger-ui-react 5.36.0, @monaco-editor/react 4.7.0,
zustand 5.1.0, yaml 2.9.1. **Working range recorded: react 18.3.x with swagger-ui-react 5.36.x.**

**Still needed. Each item is outside the architect lane; apply verbatim from §0.2:**
| Step | Files | Owner |
|---|---|---|
| 7 | `src-tauri/src/lib.rs`: delete the `.plugin(tauri_plugin_fs::init())` line | rust-dev (or re-map the architect lane to include `lib.rs`, as §2 says) |
| 8 | `src-tauri/core/{Cargo.toml,src/lib.rs}`, plus the `curl` for both schemas | rust-dev |
| 9 | `tests/shared/projectFiles.ts`, `tests/task_t002/foundation-config.test.ts`, `src-tauri/core/tests/task_t002_schemas.rs` | qa-engineer |

**Until step 8 lands, every `cargo` command in `src-tauri` fails.** Cargo.toml declares workspace member `core`, and that
directory does not exist yet. This is intended, because §9.5 fixes that shape. Generate `src-tauri/Cargo.lock` when step 8 lands.

**Dry-run proof:** a scratch copy outside the worktree had steps 7–9 applied exactly as in §0.2 and the bug file.
`npm test -- --run` gave **12/12 passing** (App 1 + all 11 QA C1–C7 assertions), `cargo test -p apicoord-core` gave **2/2 passing**,
and both schema sha256 values match §9.5.

**B3 is still partly open.** `cargo` is now at `~/.cargo/bin` (it is not on the default PATH of non-login shells, so the gate must
export it). The full `cargo test --manifest-path src-tauri/Cargo.toml` still fails on the app crate because `glib-2.0`, `gio-2.0`
and `webkit2gtk-4.1` are missing. Either install the Tauri Linux prerequisites listed under B3, or run the gate as
`cargo test -p apicoord-core`. Separately, `src-tauri/icons/` does not exist, and `generate_context!` needs those icons to build the
app crate on any OS. That is the packaging-engineer's job (`cargo tauri icon`).

### 0.4 T002 attempt 5 (2026-11-25): lane-clean resubmission

Attempt 4 was rejected because it wrote `package-lock.json` and `tsconfig.tsbuildinfo`, and neither is in the architect lane. Both are now removed.
- `tsconfig.json` now sets `"tsBuildInfoFile": "./node_modules/.tmp/tsconfig.tsbuildinfo"`. `tsc -b` (and `npm run typecheck`) therefore never write a tracked
  file at the project root; the buildinfo lands under the gitignored `node_modules/`. Re-verified: `tsc -b` → 0, and `vitest --run` → 1/1.
- **`package-lock.json` must be generated by its owner (orchestrator/T0 lane):** run `npm install` at the project root with the current
  `package.json`, then commit the resulting lock. The previous run resolved react/react-dom 18.3.1, monaco-editor 0.54.0, monaco-yaml 5.5.1,
  swagger-ui-react 5.36.0, @monaco-editor/react 4.7.0, zustand 5.1.0 and yaml 2.9.1, all within the pins.
- Steps 7–9 of §0.3 (lib.rs, `src-tauri/core/**` + schema `curl`, QA tests) still need their owners, as listed above.

### 0.5 T002 attempt 6 (2026-11-26): lockfile generated; merge conflicts resolved

The operator added `package-lock.json`, `Cargo.lock` and `tsconfig.*.json` to the architect lane, and `.tsbuildinfo` is ignored.
- `npm install` was run at the project root and `package-lock.json` was written (name `apicoord`; root deps equal package.json). It resolved
  react/react-dom 18.3.1, monaco-editor 0.54.0, monaco-yaml 5.5.1, swagger-ui-react 5.36.0, @monaco-editor/react 4.7.0 and zustand 5.1.0.
  `npm run typecheck` → 0, and `npm test -- --run` → 18/18 (App + T001 + T014 tests).
- The merge conflicts with main in this file, `ipc-contract.md` and `reviews/T002-escalation.md` are resolved. `ipc-contract.md` again holds §5 verbatim.
- **Still outside the architect lane (the hook rejected lib.rs and core/Cargo.toml again):** step 7 (`lib.rs`: drop `tauri_plugin_fs`) and
  step 8 (`src-tauri/core/**` + schemas), both for rust-dev; step 9 (QA tests incl. `src-tauri/core/tests/*.rs`) for qa-engineer; `tests/task_t002/` does not exist.
  Until step 8 lands, `cargo` cannot load the workspace and `Cargo.lock` cannot be generated. The architect generates `Cargo.lock` after that.
  The host still lacks webkit2gtk-4.1 (B3), so the full app-crate test needs the Tauri Linux prerequisites.

### 0.2 T002 apply-verbatim file set (for the orchestrator, or for the architect once B2 is re-mapped)

Each block is the **complete file content**. The order matters only for step 9 (npm install after package.json).

1. **`package.json`** (overwrite)
```json
{
  "name": "apicoord",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "typecheck": "tsc -b",
    "tauri": "tauri"
  },
  "dependencies": {
    "@monaco-editor/react": "~4.7.0",
    "@tauri-apps/api": "^2.1.1",
    "monaco-editor": "~0.54.0",
    "monaco-yaml": "~5.5.1",
    "react": "~18.3.1",
    "react-dom": "~18.3.1",
    "swagger-ui-react": "~5.36.0",
    "yaml": "^2.9.1",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/swagger-ui-react": "~5.18.0",
    "@vitejs/plugin-react": "^4.3.3",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.4"
  }
}
```

2. **`tsconfig.json`**: change only the `types` line to
`"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]`.

3. **`vite.config.ts`** (overwrite)
```ts
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tauri expects a fixed port + no HMR webSocket over a separate port.
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  worker: { format: 'es' },
  build: { target: 'chrome105', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [...configDefaults.exclude, 'tests/fixtures/**'],
  },
})
```

4. **`src-tauri/tauri.conf.json`** (overwrite; this is the current file plus `label` and the §9.3 CSP objects)
```json
{
  "$schema": "<unchanged from the scaffold: the Tauri v2 config schema>",
  "productName": "APICoord",
  "version": "0.0.1",
  "identifier": "com.weeznha.apicoord",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "APICoord",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": {
        "default-src": "'self'",
        "script-src": "'self'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data:",
        "font-src": "'self' data:",
        "worker-src": "'self' blob:",
        "connect-src": "ipc: http://ipc.localhost",
        "object-src": "'none'",
        "frame-src": "'none'",
        "base-uri": "'none'",
        "form-action": "'none'"
      },
      "devCsp": {
        "default-src": "'self'",
        "script-src": "'self'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data:",
        "font-src": "'self' data:",
        "worker-src": "'self' blob:",
        "connect-src": "ipc: http://ipc.localhost ws://localhost:1420",
        "object-src": "'none'"
      }
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```
`http://ipc.localhost` is the only http origin. It is Tauri's own IPC transport on Windows/WebView2, not a remote origin.

5. **`src-tauri/capabilities/default.json`** (overwrite)
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Baseline webview permissions. Never widen this file; add narrow files instead.",
  "windows": ["main"],
  "permissions": ["core:default", "core:window:allow-set-title"]
}
```
   **`src-tauri/capabilities/window-lifecycle.json`** (new)
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "window-lifecycle",
  "description": "Lets the close-requested flow destroy the main window after the dirty prompt.",
  "windows": ["main"],
  "permissions": ["core:window:allow-destroy"]
}
```

6. **`src-tauri/Cargo.toml`** (overwrite)
```toml
[package]
name = "app"
version = "0.0.1"
description = "Desktop scaffold generated by software-pipeline"
authors = ["Weeznha"]
edition = "2021"
rust-version = "1.75"

[lib]
name = "app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
apicoord-core = { path = "core" }
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
tracing = "0.1"
tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync", "fs", "io-util"] }

[features]
default = []
custom-protocol = ["tauri/custom-protocol"]

[workspace]
members = ["core"]
default-members = [".", "core"]
```

7. **`src-tauri/src/lib.rs`** (overwrite; this is today's file minus the `tauri_plugin_fs` line, and it compiles against the current `commands`/`error` modules)
```rust
//! Tauri application entry. The architect owns this file: it wires up plugins,
//! managed state, and the IPC command registry. Command implementations live in
//! `commands/`.

mod commands;
mod error;

use commands::health;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            health::ping,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

8. **`src-tauri/core/Cargo.toml`** (new)
```toml
[package]
name = "apicoord-core"
version = "0.0.1"
edition = "2021"
rust-version = "1.75"
description = "Pure, tauri-free logic for APICoord (text codec, EOL, MRU, paths, schemas)."

[lib]
name = "apicoord_core"
path = "src/lib.rs"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"

[dev-dependencies]
tempfile = "3"
```
   **`src-tauri/core/src/lib.rs`** (new)
```rust
//! apicoord-core: pure logic with no tauri dependency (architecture.md §2, D7).
//! Feature tasks add the §12 modules (error, models, textcodec, eol, doc, mru, paths, fsx, schemas, sniff).

/// OpenAPI 3.0 schema (draft-04), vendored byte-exact. sha256 recorded in §9.5.
pub const OAS_3_0: &str = include_str!("../schemas/oas-3.0.json");
/// OpenAPI 3.1 schema (2020-12), vendored byte-exact. sha256 recorded in §9.5.
pub const OAS_3_1: &str = include_str!("../schemas/oas-3.1.json");
```
   **Schemas** (byte-exact; this is a one-time, authoring-time download, and the app makes no network calls):
```
mkdir -p src-tauri/core/schemas
curl -sSL -o src-tauri/core/schemas/oas-3.0.json https://spec.openapis.org/oas/3.0/schema/2021-09-28
curl -sSL -o src-tauri/core/schemas/oas-3.1.json https://spec.openapis.org/oas/3.1/schema/2022-10-07
sha256sum src-tauri/core/schemas/*.json   # must print 7a0db731…822cf and da01ba28…14ed0
```

9. **QA's files**, verbatim from `bugs/t002-qa-lane-blocked-gate-tests-undeliverable.md`: `tests/shared/projectFiles.ts`,
`tests/task_t002/foundation-config.test.ts` and `src-tauri/core/tests/task_t002_schemas.rs`.

10. **Install and verify** (from the project root):
```
npm install                                   # writes package-lock.json; commit it (not node_modules)
npm run typecheck                             # tsc -b → exit 0
npm test -- --run                             # 12 tests: App.test.tsx (1) + tests/task_t002 (11)
cargo test -p apicoord-core --manifest-path src-tauri/Cargo.toml   # B3 fallback: needs rustup only
cargo test --manifest-path src-tauri/Cargo.toml                    # full gate: also needs webkit2gtk-4.1 (B3)
```
Check after the install: `grep -c plugin-fs package-lock.json` must print `0`, and
`git grep -n "plugin-fs\|plugin-dialog" -- src` must find nothing in the frontend.

How §0.2 maps to QA's assertions: C1 → 1, 10; C2 → 1, 2; C3 → 6, 8, 9; C4 → 3; C5 → 5, 7; C6 → 4; C7 → 8.

**Correct gate for this repo** (m1-foundation T0), run from `projects/apicoord/`:
```
cargo test --manifest-path src-tauri/Cargo.toml      # runs app + apicoord-core (workspace default-members)
npm test -- --run && npm run typecheck
```

---

## 1. System shape

One process, one window (label `main`). Rust owns **every byte on disk**: open, save, recent list and schemas. It also owns the native menu and the path allow-list. The webview owns the **text buffer and everything derived from it**: Monaco, parse worker, swagger preview, validation markers, dirty state and the prompts.

```
┌──────────────────────── Webview (React 18, strict CSP, no fs/http) ────────────────────────┐
│  Monaco (+monaco-yaml / json)  ──onChange──► parse.worker (yaml→JSON, hash) ──► store ──► SwaggerUI │
│        ▲ markers                                                                 │         │
│        └──────────── schema text (inline) ◄── get_schema ──┐                     ▼         │
│  fileActions dispatcher ◄── menu://action  ◄───────────────┼──── StatusBar / Title / Prompt │
└───────────────────────────────┬─────────────────────────────┼──────────────────────────────┘
                     invoke(cmd)│                             │ events
┌───────────────────────────────▼─────────────────────────────┴──────────────────────────────┐
│ app crate (src-tauri): commands/*, menu.rs, Session state, dialogs (tauri-plugin-dialog, Rust API) │
│ apicoord-core (src-tauri/core): textcodec, eol, mru, paths, atomic write, schemas, version sniff     │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

There is no network code anywhere. Schemas, Monaco, workers and swagger are all bundled.

## 2. Modules & ownership

| Area | Owner | Location |
|---|---|---|
| Tauri entry, plugin wiring, managed state, command registry | architect | `src-tauri/src/lib.rs` |
| Tauri config, CSP, capabilities | architect | `src-tauri/tauri.conf.json`, `src-tauri/capabilities/*.json` |
| Cargo / npm deps, Vite, tsconfig | architect | `src-tauri/Cargo.toml`, `src-tauri/core/Cargo.toml`, `package.json`, `vite.config.ts`, `tsconfig.json` |
| **Pure logic crate (no tauri dep)** | rust-dev | `src-tauri/core/src/{textcodec,eol,doc,mru,paths,fsx,schemas,sniff}.rs` |
| Boundary types + error enum (shape fixed by §5) | architect (shape) / rust-dev (impl) | `src-tauri/core/src/{models,error}.rs`; `src-tauri/src/error.rs` re-exports |
| Bundled schemas | rust-dev (copy verbatim, §9.5) | `src-tauri/core/schemas/oas-3.0.json`, `oas-3.1.json` |
| IPC commands (thin: lock state, call core, show dialogs, emit) | rust-dev | `src-tauri/src/commands/{file,recent,schema,app,health}.rs` (`app.rs` = `exit_app`) |
| Session state struct | rust-dev (shape fixed by §4) | `src-tauri/src/state.rs` |
| Native menu | rust-dev | `src-tauri/src/menu.rs` |
| IPC wrappers + TS boundary types | frontend-dev | `src/ipc/{types,file,recent,schema,app,events}.ts` |
| Store | frontend-dev | `src/state/store.ts` |
| Editor | frontend-dev | `src/features/editor/` |
| Preview + parse worker | frontend-dev | `src/features/preview/` |
| Validation binding | frontend-dev | `src/features/validation/` |
| File actions, dirty guard, prompt | frontend-dev | `src/features/file/` |
| Layout, status bar | frontend-dev | `src/components/` |
| Perf marks (names fixed by §6.3) | frontend-dev (emit) / QA (harness) | `src/perf/marks.ts`, harness under `src/__tests__/` + `scripts/perf/` |
| Fixtures + fixture generator | qa-engineer | `tests/fixtures/`, `tests/fixtures/gen-big-10k.mjs` |
| Rust tests | qa-engineer | `src-tauri/core/tests/task_<id>_*.rs`, `src-tauri/tests/task_<id>_*.rs` |
| Frontend tests | qa-engineer | `src/__tests__/tasks/task_<id>/` |
| Packaging / CI | packaging-engineer | `packaging/`, `.github/workflows/` (no Windows CI this increment, Q2) |

Why there is a core crate: `cargo test -p apicoord-core` needs no webkit and runs in about a second, and every acceptance check for round-trip, MRU or allow-list is a pure function test. The app crate stays thin, so it has nothing much to test that needs a window.

## 3. Component tree ("scene tree")

```
<StrictMode>
 <App>                               mounts once; wires bootstrap effects (§4)
  ├─ <SplitPane default=50/50 draggable>
  │   ├─ <EditorPane>                React.lazy → loads Monaco chunk; shows "Loading editor…" until ready
  │   │    └─ <MonacoEditor>         one model per open document; never recreated on language switch
  │   └─ <PreviewPane>               React.lazy → loads swagger-ui-react chunk
  │        ├─ <StaleBadge>           previewStatus.kind === 'stale' → "Preview is out of date — line N: msg"
  │        ├─ <EmptyInvalid>         previewStatus.kind === 'empty-invalid' → "Fix the syntax error to see a preview"
  │        ├─ <EmptyNoDoc>           no document
  │        └─ <SwaggerView spec>     memo; receives only objects; supportedSubmitMethods=[]; docExpansion="list"
  ├─ <StatusBar>   [Language ▾][UTF-8 BOM][CRLF][preview status][3 problems][Ln 4, Col 12][notice]
  └─ <DirtyPrompt> in-webview modal: Save / Don't Save / Cancel (resolves a Promise)
```

Rules:
- The swagger tree is never unmounted on a parse error. "Keep last good" means the `spec` in the store simply doesn't change.
- Neither `EditorPane` nor `PreviewPane` is in the initial bundle (spec: lazy). The worker is created on first document open.
- The three-way prompt is a **webview modal, not a native dialog**: `plugin-dialog`'s message dialog has no reliable 3-button variant, a webview modal needs no capability, and jsdom can test it.

## 4. Singletons ("autoloads")

| Singleton | Side | Lifetime | Responsibility |
|---|---|---|---|
| `SessionState = Mutex<Session>` | Rust managed state | app | `current: Option<CurrentDoc>` (path, **original bytes**, encoding, BOM, majority EOL, mixed flag) and `issued: HashSet<NormPath>` (allow-list). Recent entries are added to `issued` when loaded. |
| `MruStore` | Rust (inside `Session`, persisted by core `mru.rs`) | app | ≤5 entries; loaded from `app_data_dir/recent.json` in `setup()`; corrupt → empty. |
| `SchemaStore` | Rust core `schemas.rs` | app | `setup()` copies the bundled schemas to `app_data_dir/schemas/` if missing. `get_schema` reads the copy, JSON-parses it, and on failure returns the bundled text and rewrites the copy. Bundled = `include_str!` (compiled in, so no resource-path resolution). |
| `useStore` (Zustand) | frontend | app | The only UI state; shape in §6.1. The store also acts as the event bus, so there is no separate emitter. |
| `monacoSetup.ts` | frontend | first editor load | Sets `self.MonacoEnvironment.getWorker`, calls `loader.config({ monaco })` (**required**, otherwise `@monaco-editor/react` pulls from jsDelivr), and runs `configureMonacoYaml(monaco, { enableSchemaRequest: false, validate: true, schemas: [] })` once. |
| `parseClient.ts` | frontend | first doc open | Owns the single `parse.worker` instance, the `seq` counter and stale-reply drop. |
| `fileActions.ts` | frontend | app | **The single dispatcher** for `open / save / saveAs / close / recent / exit / windowClose`. Every input source (§7) calls it, and only it calls the file IPC. It contains `confirmDiscardIfDirty()`. |

Bootstrap order in `App` (one effect): `listen('menu://action')` → `listen('recent://changed')` → `getCurrentWindow().onCloseRequested(...)` → `list_recent()`. Each listener must be unlistened in cleanup, because StrictMode double-mounts.

## 5. Rust ↔ UI contract (commands, events, types) — authoritative

`design/ipc-contract.md` mirrors this section verbatim (copied in T001, re-synced in T002); change both files together, in the same task.

### 5.1 Commands

All commands are `async`, return `Result<T, AppError>`, and run on the tokio pool. Dialogs use the Rust `tauri_plugin_dialog::DialogExt` **blocking** API, which is legal off the main thread and gives the webview no dialog capability.

| Command | Args (TS) | Returns | Errors | Notes |
|---|---|---|---|---|
| `ping` | — | `string` | — | unchanged |
| `open_spec_dialog` | — | `OpenedSpec \| null` | `unsupported_encoding`, `io_error` | `null` = user cancelled. Filter `yaml,yml,json` is a hint (an "All files" filter is also offered). On success: path → `issued`, `current` replaced, MRU move-to-front, emits `recent://changed`, rebuilds Recent submenu, enables Save/Save As/Close. On error: **no state change**. |
| `open_recent` | `{ path: string }` | `OpenedSpec` | `not_issued`, `not_found`, `unsupported_encoding`, `io_error` | `path` must be in `issued`. On `not_found` Rust removes the entry, persists it and emits `recent://changed`; the frontend shows "<name> no longer exists". |
| `save_spec` | `{ text: string, clean: boolean }` | `SaveResult` | `no_document`, `locked`, `io_error` | `clean=true` → writes `current.original_bytes` unchanged (`wrote=false` if the file still has identical bytes, so the write is skipped). `clean=false` → normalise every `\r\n`/`\r`/`\n` to `current.eol`, prepend BOM if `has_bom`, encode with `current.encoding`, atomic write, then `original_bytes = written bytes` and `mixed_eol=false`. |
| `save_spec_as` | `{ text: string, clean: boolean }` | `SaveResult \| null` | `no_document`, `locked`, `io_error` | Rust shows the save dialog (default name = current file name). `clean=true` → original bytes to the new path (Q4). The new path goes into `issued` and becomes `current.path`; MRU updated, event emitted. `null` = cancelled. |
| `close_document` | — | `void` | — | Clears `current`, disables Save/Save As/Close. Called by the frontend after the dirty guard passes. |
| `list_recent` | — | `RecentEntry[]` | — | Most recent first, ≤5. |
| `get_schema` | `{ version: "3.0" \| "3.1" }` | `string` (JSON text) | `internal` (only if the bundled copy is also unparsable, which can't happen) | Frontend calls `JSON.parse` once and caches per version. |
| `exit_app` | — | `void` | — | Lives in `commands/app.rs`. Called by the frontend after the dirty guard for menu Exit; `app.exit(0)`. |

Window close (X / Alt+F4) has no command: `onCloseRequested` → guard → `getCurrentWindow().destroy()`.
**Complete webview permission list:** `core:default`, `core:window:allow-set-title`, `core:window:allow-destroy`.
Menu enable/disable (Save/Save As/Close) is driven by Rust from the `current` transitions in `open_*`/`close_document`, and the webview never toggles it.

**The allow-list rule:** the only command that takes a path is `open_recent`. Its path must already be in `issued`: from a dialog result, the current document, or a loaded MRU entry. Paths are compared in normalised form (§5.4).

**Atomic write** (`core::fsx::atomic_write(path, bytes)`): write `.<name>.apicoord-tmp-<pid>` in the same dir → `sync_all` → `rename` over the target. On Windows, `ERROR_SHARING_VIOLATION`/`ERROR_LOCK_VIOLATION`/`ERROR_ACCESS_DENIED` on rename get **5 retries × 50ms**, then `locked`. The temp file is removed on any failure, and the original is never truncated first.

### 5.2 Events (Rust → webview)

| Event | Payload | Emitted when |
|---|---|---|
| `menu://action` | `MenuEvent { action: MenuAction, path?: string }` | A native menu item is activated. Rust **never** performs file actions from the menu itself, because the dirty guard lives in the webview. |
| `recent://changed` | `RecentEntry[]` | After any MRU mutation |

`MenuAction = "open" | "save" | "save-as" | "close" | "recent" | "exit"`; `path` is set only for `"recent"`. Menu item IDs: `file.open`, `file.save`, `file.save-as`, `file.close`, `file.exit`, `file.recent.<0..4>`. **Exit is a normal item, not `PredefinedMenuItem::quit`**, because the predefined item would bypass the dirty guard.

### 5.3 Types

Rust: `#[serde(rename_all = "camelCase")]` on structs. TS mirrors live in `src/ipc/types.ts`.

```ts
export type TextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be'
export type Eol = 'lf' | 'crlf'
export type OpenApiVersion = '3.0' | '3.1'

export interface OpenedSpec {
  path: string; fileName: string
  text: string              // decoded, BOM stripped, EOLs exactly as on disk
  encoding: TextEncoding; hasBom: boolean
  eol: Eol                  // majority EOL (ties → lf; no line breaks → lf); also what an edited save writes
  mixedEol: boolean
  openapiVersion: OpenApiVersion | null   // sniffed from top-level `openapi:` / "openapi"; null → frontend uses 3.1
}
export interface SaveResult {
  path: string; fileName: string
  encoding: TextEncoding; hasBom: boolean; eol: Eol
  wrote: boolean            // false when a clean save found identical bytes and skipped
  eolNormalised: boolean    // true when this save converted a mixed-EOL file → status-bar note
}
export interface RecentEntry { path: string; fileName: string; lastOpened: number /* unix ms */ }
export interface MenuEvent { action: MenuAction; path?: string }
export interface AppError { code: AppErrorCode; message: string }
export type AppErrorCode =
  'unsupported_encoding' | 'not_issued' | 'not_found' | 'no_document' | 'locked' | 'io_error' | 'internal'
```

Change from the spec: `OpenedSpec.majorityEol` is folded into `eol`, because they were always equal by definition, and `mixedEol` carries the extra information.

```rust
// core/src/error.rs — the IPC error shape. Serialises as {"code":"locked","message":"..."}
#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "code", content = "message", rename_all = "snake_case")]
pub enum AppError {
    #[error("{0}")] UnsupportedEncoding(String), #[error("{0}")] NotIssued(String),
    #[error("{0}")] NotFound(String),            #[error("{0}")] NoDocument(String),
    #[error("{0}")] Locked(String),              #[error("{0}")] IoError(String),
    #[error("{0}")] Internal(String),
}
```
Tauri rejects the `invoke` promise with that **object**, not a string, so the existing comment in `src-tauri/src/error.rs` about `Display`/`code:` prefixes is wrong and should go. The TS wrappers rethrow it typed as `AppError`. Messages are human-readable sentences. `unsupported_encoding` → "This file isn't UTF-8 or UTF-16 and can't be opened safely."

### 5.4 Text and path rules (core)

- **Decode:** BOM `EF BB BF` → UTF-8+BOM; `FF FE` → UTF-16LE; `FE FF` → UTF-16BE; otherwise strict `std::str::from_utf8` → UTF-8, and anything else → `unsupported_encoding`. BOM-less UTF-16 is unsupported. Decoding is std-only (`String::from_utf8`, `char::decode_utf16`). **No `encoding_rs`**, because it can't encode UTF-16 and we don't support legacy codecs.
- **EOL count:** `crlf` = count of `\r\n`, `lf` = lone `\n`, lone `\r` counted as lf. `mixed = crlf>0 && lf>0`. Majority: crlf if crlf>lf else lf.
- **Encode:** UTF-8 → bytes; UTF-16 → `encode_utf16` → `to_le_bytes`/`to_be_bytes`; prepend the BOM when `has_bom`.
- **Path normalisation (`NormPath`)** is used for `issued` lookups and MRU de-dup only. The original path string is kept for display and IO. Steps: strip the `\\?\` prefix (`\\?\UNC\` → `\\`), convert `/` to `\` on Windows, then lowercase on Windows only.
- **Version sniff:** scan the first 200 lines for `^\s*["']?openapi["']?\s*:\s*["']?(3\.[01])\.` → `3.0`/`3.1`, else `null`. It is a regex, not a YAML parse, so it stays fast.

## 6. Frontend internals

### 6.1 Store shape (`src/state/store.ts`)

```ts
type Language = 'yaml' | 'json'
type PreviewStatus =
  | { kind: 'none' }                                   // no document
  | { kind: 'ok' }
  | { kind: 'stale'; line: number; message: string }   // last-good kept
  | { kind: 'empty-invalid'; line: number; message: string }
interface DocumentSlice {
  doc: null | { path: string; fileName: string; encoding: TextEncoding; hasBom: boolean; eol: Eol;
                mixedEol: boolean; openapiVersion: OpenApiVersion | null }
  language: Language; languageOverridden: boolean      // session-only (Q5)
  savedVersionId: number; dirty: boolean
}
interface PreviewSlice { previewStatus: PreviewStatus; spec: object | null; specHash: string | null; lastSeq: number }
interface ValidationSlice { markerCount: number }
interface UiSlice { recent: RecentEntry[]; notice: string | null; cursor: { line: number; col: number } }
```
`previewStatus` is the **only** source for preview UI and for tests (rule 2). The buffer text is **not** in the store, because Monaco owns it. That avoids a 400 KB string copy per keystroke.

### 6.2 Keystroke → preview pipeline

1. Monaco `onDidChangeModelContent` → `mark('ks')` → update `dirty = model.getAlternativeVersionId() !== savedVersionId` (this also clears dirty when undo returns to the saved text) → restart the 200ms debounce.
2. Debounce fires → `seq++` → `worker.postMessage({ seq, text: model.getValue(), language })`.
3. Worker (`parse.worker.ts`, uses the `yaml` package for both YAML and JSON because JSON is YAML 1.2): `parseDocument(text, { prettyErrors: true })`. Errors, or a root that isn't a plain object, give `{ seq, ok: false, line, message }`. Otherwise `json = doc.toJS({ maxAliasCount: 100 })`, `hash = fnv1a64(JSON.stringify(json))`, reply `{ seq, ok: true, hash, json }`.
4. Main thread: if `seq < lastShownSeq`, drop the reply (rule 3). If ok and `hash === specHash`, set `previewStatus=ok` and **don't** call `setSpec` (rule 4). If ok and the hash changed, set `spec` and then `mark('commit')` in `SwaggerView`'s `useLayoutEffect` after the commit. If not ok, use `stale` when `spec` is set, otherwise `empty-invalid`, and set a Monaco marker with owner `apicoord-parse` at `line`.
5. On a language override or a new document, the parse runs immediately with no debounce.

The worker stays only if the harness says it pays off; research flagged structured-clone cost as unmeasured. Swapping it for in-thread parsing changes only `parseClient.ts`, because the protocol is identical.

### 6.3 Perf marks (contract for QA's harness)

`performance.mark('apicoord:ks')` on every content change, and `performance.mark('apicoord:commit', { detail: { seq } })` on swagger commit. Latency = commit time − time of the **last** `ks` before the debounce fired that produced `seq`. Harness output: p50/p95 for Petstore and big-10k separately. It is measured from a `tauri build` release binary on the Windows target (gate-review follow-up). **A miss holds the increment (Q3).** There is no line-count debounce fallback; that idea from the spec's tuning section is void.

Budget: 200ms debounce + ≤50ms for postMessage, parse, clone, hash and swagger render. Petstore parse+render should be well inside that. For big-10k, the harness runs in T0b, **before** feature work, so a miss is known on day 1 and can be redesigned rather than degraded.

### 6.4 Validation binding

- `jsonSchemaFor(version)` = `JSON.parse(await get_schema(version ?? '3.1'))`, cached.
- YAML: `monacoYaml.update({ enableSchemaRequest: false, validate: true, schemas: [{ uri: 'apicoord://schemas/oas-<v>.json', fileMatch: [model.uri.toString()], schema }] })`.
- JSON: `monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ validate: true, enableSchemaRequest: false, schemas: [same] })`.
- The model URI is `file:///doc-<n>.<yaml|json>`, with a fresh `n` per opened document. A **language override does not change the URI**. It calls `monaco.editor.setModelLanguage(model, lang)` then rebinds the schema for the new language and triggers the immediate re-parse, all in one function (`applyLanguage`, rule 5).
- Marker count = `monaco.editor.getModelMarkers({ resource: model.uri }).length` (all owners, including `apicoord-parse`), updated on `onDidChangeMarkers`.

### 6.5 Open / save sequence (frontend)

- **open:** `confirmDiscardIfDirty()` → `open_spec_dialog()` → if not null: dispose the old model and create a new one with `text` → `model.setEOL(eol === 'crlf' ? CRLF : LF)` (Monaco now holds the majority EOL) → language from the extension table (spec m1-editor), override reset (Q5) → `savedVersionId = model.getAlternativeVersionId()` → immediate parse → schema bind.
- **save:** `save_spec({ text: model.getValue(), clean: !dirty })` → `savedVersionId = current altVersionId`; if `eolNormalised`, show the note "Mixed line endings: saved as CRLF" (Q6). On error the buffer stays dirty and the status bar shows the message.
- **saveAs:** same, with `save_spec_as`; on non-null, update `doc.path/fileName` and the title; **keep the override** (Q5).
- **confirmDiscardIfDirty()** → `true` when clean; otherwise opens `DirtyPrompt`. Save → run save, return its success (false on cancel or failure). Don't Save → true. Cancel → false.
- **windowClose:** `onCloseRequested(e => { e.preventDefault(); if (await confirmDiscardIfDirty()) await getCurrentWindow().destroy() })`. **Exit** goes through the same guard, then `exit_app`.
- Title: `${dirty ? '• ' : ''}${fileName} — APICoord`, or `APICoord` when there's no document, via `getCurrentWindow().setTitle`.

## 7. Input actions (shortcuts) — one owner each

| Action | Keys | Owner | Calls |
|---|---|---|---|
| Open | Ctrl+O | **TBD by spike (a)** | `fileActions.open()` |
| Save | Ctrl+S | **TBD by spike (a)** | `fileActions.save()` |
| Save As | Ctrl+Shift+S | **TBD by spike (a)** | `fileActions.saveAs()` |
| Close | Ctrl+W | **TBD by spike (a)** | `fileActions.close()` |
| Exit | Alt+F4 / menu | OS → `onCloseRequested` / menu item | `fileActions.exit()` |
| Undo/redo, find, etc. | Monaco defaults | Monaco | — |

Spike (a) outcome rule, applied to all four together:
- **Menu accelerator fires while Monaco has focus:** the native menu items carry the accelerators and Monaco binds nothing.
- **It doesn't fire:** the menu items have **no accelerator**, and their labels show the shortcut text (for example `Save\tCtrl+S`). `editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, ...)` is the sole binding. A `window` keydown listener also covers the case where focus is outside Monaco, but only when `!editor.hasTextFocus()`, which keeps a single owner per key event.

Either way, the menu event and the Monaco command land in the same `fileActions` function. QA asserts that one keypress → one `save_spec`.

## 8. Trust boundaries ("layers")

There is no physics in this app. The layers that matter are trust boundaries.

| Layer | Can | Cannot |
|---|---|---|
| Webview JS (incl. swagger-rendered Markdown from foreign specs) | `invoke` the commands in §5.1, listen to the §5.2 events, set its own title, destroy its own window | read/write files, fetch over the network (CSP `connect-src` is IPC only), open native dialogs, pass arbitrary paths |
| Rust command layer | read/write paths in `issued` only, show dialogs, write `app_data_dir` | (no network crates in the dependency tree) |
| Disk | — | — |

CSP and capabilities are in §9.3–9.4. swagger-ui gets `supportedSubmitMethods: []`, and the CSP is the second layer that blocks outbound requests.

## 9. Config deltas (T0 owner applies these verbatim; blocked for the architect by B2)

### 9.1 `package.json`
- **Remove:** `@tauri-apps/plugin-fs` (rule 10) and `@tauri-apps/plugin-dialog` (dialogs are Rust-side; the prompt is a webview modal).
- **Add deps:** `@monaco-editor/react ~4.7.0`, `monaco-editor ~0.54.0` (**not 0.58**: monaco-yaml 5.5.1 is tested against `^0.54.0`, and 0.58 shipped 2026-11-23), `monaco-yaml ~5.5.1`, `swagger-ui-react ~5.36.0`, `yaml ^2.9.1` (already a monaco-yaml dep, used directly in the worker), `zustand ^5.0.0`.
- **Pin:** `react`/`react-dom` `~18.3.1`. swagger-ui-react 5.36 peer range is `>=16.8 <20`, so React 19 would also satisfy it, but we stay on the 18 line to avoid StrictMode warnings in swagger; T0's build confirms. **Working range recorded: react 18.3.x with swagger-ui-react 5.36.x.**
- **Add devDeps:** `@types/swagger-ui-react ~5.18.0`.
- **Add script:** `"typecheck": "tsc -b"`. Rename `name` to `apicoord`.
- **Commit `package-lock.json`.**

### 9.2 `vite.config.ts` / `tsconfig.json`
- vite: `worker: { format: 'es' }`, `build: { target: 'chrome105', sourcemap: false }`, and `test.exclude` adds `tests/fixtures/**`.
- tsconfig `types` adds `"vite/client"` (needed for `?worker` imports).
- Worker imports (verified to exist in the pinned packages): `monaco-editor/esm/vs/editor/editor.worker?worker`, `monaco-editor/esm/vs/language/json/json.worker?worker`, `monaco-yaml/yaml.worker?worker`, `./parse.worker?worker`.

### 9.3 `src-tauri/tauri.conf.json`
- Window: add `"label": "main"`.
- Replace `"csp": null` with:
```json
"csp": {
  "default-src": "'self'",
  "script-src": "'self'",
  "style-src": "'self' 'unsafe-inline'",
  "img-src": "'self' data:",
  "font-src": "'self' data:",
  "worker-src": "'self' blob:",
  "connect-src": "ipc: http://ipc.localhost",
  "object-src": "'none'",
  "frame-src": "'none'",
  "base-uri": "'none'",
  "form-action": "'none'"
},
"devCsp": {
  "default-src": "'self'",
  "script-src": "'self'",
  "style-src": "'self' 'unsafe-inline'",
  "img-src": "'self' data:",
  "font-src": "'self' data:",
  "worker-src": "'self' blob:",
  "connect-src": "ipc: http://ipc.localhost ws://localhost:1420",
  "object-src": "'none'"
}
```
`'unsafe-inline'` for styles only: both Monaco and swagger inject `<style>`/style attributes. Spike (c) confirms that nothing else is needed. If it turns out something is, the spike reports it and the architect decides; nobody loosens the CSP ad hoc.

### 9.4 Capabilities
- `capabilities/default.json` → `["core:default", "core:window:allow-set-title"]`. This removes `dialog:allow-open/save`, which narrows the file.
- New `capabilities/window-lifecycle.json` (`windows: ["main"]`, `permissions: ["core:window:allow-destroy"]`) for the close-requested flow.
- **No** `fs:*`, `http:*`, `shell:*` or `dialog:*` in any capability file. QA's test asserts this.

### 9.5 Rust crates
- `src-tauri/Cargo.toml`: remove `tauri-plugin-fs`; add `apicoord-core = { path = "core" }`; add
  `[workspace] members = ["core"]` and `default-members = [".", "core"]`, so a plain `cargo test` in `src-tauri` runs both. Keep `tauri-plugin-dialog`, which is used from Rust only. Add `tracing = "0.1"`.
- `src-tauri/core/Cargo.toml`: `name = "apicoord-core"`, `edition = "2021"`, deps `serde (derive)`, `serde_json`, `thiserror = "1"`; dev-dep `tempfile = "3"`. **No tauri, no network crates, no `encoding_rs`.**
- `lib.rs`: drop `tauri_plugin_fs::init()`. `.manage(Mutex::new(Session::default()))`. In `.setup(...)`: resolve `app_data_dir`, `schemas::ensure_copied`, `mru::load`, build the menu. Register the §5.1 commands. Add `.on_menu_event` → emit `menu://action`.
- Schemas: vendor verbatim into `src-tauri/core/schemas/` and load them with `include_str!`:
  - `oas-3.0.json` ← `https://spec.openapis.org/oas/3.0/schema/2021-09-28`, sha256 `7a0db7311a69d8b7f2505f59c5d4cbb58539a0961df0c05724a07538014822cf` (draft-04)
  - `oas-3.1.json` ← `https://spec.openapis.org/oas/3.1/schema/2022-10-07`, sha256 `da01ba28852cac0de53893797cb8d1942bc3b05084f526dcc216717dec314ed0` (2020-12; one `$dynamicRef: "#meta"`, no remote `$ref`s, verified)

  This is a one-time download at authoring time; the app makes no network calls at runtime. Record the hashes in a QA test.

## 10. Persistence (`app_data_dir`)

```
app_data_dir/
  recent.json            [{ "path": "...", "lastOpened": 1732460000000 }]  ≤5, atomic write, corrupt → []
  schemas/oas-3.0.json   copied from the binary on first run; restored on corruption
  schemas/oas-3.1.json
```
No settings file in M1. The language override is session-only (Q5).

## 11. Cross-cutting conventions

- snake_case in Rust and camelCase in TS. Boundary structs use `#[serde(rename_all = "camelCase")]`; enum value spellings are fixed by §5.3.
- No `unwrap()` outside `setup()`. Commands lock `Session` briefly and **never hold the lock across a dialog**.
- Logging: `tracing` in Rust, and only paths and error codes are logged, never file contents. The frontend logs through `console` with an `[apicoord:<area>]` prefix.
- The frontend never imports `@tauri-apps/plugin-fs` or `@tauri-apps/plugin-dialog`; this is grep-tested.
- No `any` in TS boundary types. The worker protocol types live in `src/features/preview/protocol.ts`.
- Capabilities only grow through new narrow files, and `default.json` never widens.
- Windows conventions for shortcuts and dialogs.

## 12. Core skeletons — T0 creates these verbatim (architect blocked by B2)

They are kept to the files whose shape is a cross-lane contract. Bodies are `todo!()` or `throw`, and feature tasks fill them in.
Together with §5.3 (`core/src/error.rs`, `src/ipc/types.ts`) and §6.1 (store types), this is the full skeleton set.

**`src-tauri/src/state.rs`**
```rust
use std::{collections::HashSet, sync::Mutex};
use apicoord_core::{models::{Eol, TextEncoding, RecentEntry}, paths::NormPath};

pub struct CurrentDoc {
    pub path: std::path::PathBuf,
    pub original_bytes: Vec<u8>,
    pub encoding: TextEncoding,
    pub has_bom: bool,
    pub eol: Eol,
    pub mixed_eol: bool,
}
#[derive(Default)]
pub struct Session {
    pub current: Option<CurrentDoc>,
    pub issued: HashSet<NormPath>,
    pub recent: Vec<RecentEntry>,      // ≤5, newest first; persisted by core::mru
    pub app_data_dir: std::path::PathBuf,
}
pub type SessionState = Mutex<Session>;
```

**`src-tauri/src/lib.rs`** (wiring only)
```rust
mod commands; mod error; mod menu; mod state;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(state::Session::default()))
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            apicoord_core::schemas::ensure_copied(&dir)?;
            let recent = apicoord_core::mru::load(&dir);             // corrupt → empty
            { let s = app.state::<state::SessionState>(); let mut s = s.lock().unwrap();
              s.app_data_dir = dir; s.recent = recent; /* + seed `issued` from recent */ }
            menu::install(app.handle())?;                            // builds File menu + Recent submenu
            Ok(())
        })
        .on_menu_event(|app, ev| { if let Some(e) = menu::to_event(ev.id().as_ref(), app) { let _ = app.emit("menu://action", e); } })
        .invoke_handler(tauri::generate_handler![
            commands::health::ping,
            commands::file::open_spec_dialog, commands::file::open_recent,
            commands::file::save_spec, commands::file::save_spec_as, commands::file::close_document,
            commands::recent::list_recent, commands::schema::get_schema, commands::app::exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**`src-tauri/core/src/lib.rs`**: `pub mod {error, models, textcodec, eol, doc, mru, paths, fsx, schemas, sniff};`. These are pure functions with no tauri dependency.
`models.rs` holds `TextEncoding` (`#[serde(rename = "utf-8")]` etc.), `Eol` (`lowercase`), `OpenedSpec`, `SaveResult`, `RecentEntry`, `MenuEvent`, all camelCase.

**`src/features/file/fileActions.ts`**: the single dispatcher (§4, §7)
```ts
export interface FileActions {
  open(): Promise<void>; openRecent(path: string): Promise<void>
  save(): Promise<boolean>; saveAs(): Promise<boolean>
  close(): Promise<void>; exit(): Promise<void>; windowClose(): Promise<void>
  confirmDiscardIfDirty(): Promise<boolean>
}
export const fileActions: FileActions
```

**`src/features/preview/protocol.ts`**: worker messages
```ts
export interface ParseRequest { seq: number; text: string; language: 'yaml' | 'json' }
export type ParseReply =
  | { seq: number; ok: true; hash: string; json: Record<string, unknown> }
  | { seq: number; ok: false; line: number; message: string }
```

**`src/perf/marks.ts`**
```ts
export const markKeystroke = () => performance.mark('apicoord:ks')
export const markCommit = (seq: number) => performance.mark('apicoord:commit', { detail: { seq } })
```

There is no separate event bus. Rust → webview signalling is the two Tauri events in §5.2, and inside the webview the Zustand store is the bus (§4).
Adding an emitter library would give state two homes.

## 13. Decisions log

| # | Decision | Source | Date |
|---|---|---|---|
| D1 | Rust owns all disk IO; `plugin-fs` removed; the only command taking a path is `open_recent`, which is allow-list-checked | council #2, #10 | 2026-11-24 |
| D2 | Both OAS schemas are bundled with `include_str!` and copied to `app_data_dir/schemas`. There is no fetch and no network crate | council #3, operator Q1 | 2026-11-24 |
| D3 | p95 <250ms is a hard gate for Petstore **and** big-10k; the line-count debounce fallback is removed, and a miss holds the increment | operator Q3 | 2026-11-24 |
| D4 | A clean save or Save As writes the original bytes; an edited save writes the majority EOL with the original encoding and BOM | council #2, Q4, Q6 | 2026-11-24 |
| D5 | The language override is session-only, survives Save As, resets on open; it uses `setModelLanguage`, and the model URI stays fixed | council #9, Q5 | 2026-11-24 |
| D6 | Encoding, BOM and EOL are shown in the status bar | Q7 | 2026-11-24 |
| D7 | Pure logic goes in the `apicoord-core` crate with no tauri dependency, so the tests run without webkit | architect (B3) | 2026-11-24 |
| D8 | The three-way dirty prompt is a webview modal, not a native dialog, so the webview gets no dialog capability | architect | 2026-11-24 |
| D9 | The native menu only emits `menu://action`, and the webview's `fileActions` is the single dispatcher. Exit is a custom item, not predefined quit | council #6, #7, #8 | 2026-11-24 |
| D10 | Shortcut ownership depends on spike (a), with one owner per key and no de-duplication layer | council #6 | 2026-11-24 |
| D11 | State is Zustand; the buffer text lives in Monaco only, not the store | architect | 2026-11-24 |
| D12 | The worker parses with `yaml` for both languages, and a hash skip avoids redundant `setSpec` calls; the harness decides whether the worker stays | council #4 | 2026-11-24 |
| D13 | `monaco-editor ~0.54.0` (monaco-yaml's tested line), React 18.3.x, swagger-ui-react 5.36.x | architect, T0 verifies | 2026-11-24 |
| D14 | IPC errors are objects `{code, message}` with snake_case codes, and `OpenedSpec.majorityEol` is folded into `eol` | architect | 2026-11-24 |
| D15 | Strict CSP: `connect-src` is IPC only and `'unsafe-inline'` is allowed for styles only; spike (c) validates it | council #10 | 2026-11-24 |
| D16 | §5 is the authoritative IPC contract until `ipc-contract.md` is replaced with §5 verbatim; `exit_app` lives in `commands/app.rs` | operator procedural note; B2 | 2026-11-24 |
| D17 | No event-bus library: Tauri events cross the process boundary, and the Zustand store is the in-webview bus. The skeleton set is §12 | architect | 2026-11-24 |
| D18 | The test gate is cargo (`src-tauri` workspace) + vitest + `tsc -b` from the project root; the mvn/backend gate is wrong for this repo | foundation T0; B1 | 2026-11-24 |
