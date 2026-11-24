# T002 gate tests can't be written: QA lane is mapped to the Spring layout (B1/B2)

**Severity:** blocker (T002 has no automated gate until this is fixed; T0 blocks every feature task)

## What happened
The orchestrator asked for T002 gate tests in `worktrees/apicoord/t002/tests/task_t002/`. The ownership
hook rejected every path that the repo's gate actually runs:

| Path tried | Result |
|---|---|
| `tests/shared/projectFiles.ts` | Blocked |
| `tests/task_t002/probe.txt` | Blocked |
| `src/__tests__/tasks/task_t002/probe.txt` | Blocked |

The hook allows only `backend/src/test/java/tasks/**`, `frontend/src/__tests__/tasks/**` and `bugs/**`.
Neither `backend/` nor `frontend/` exists in apicoord. That is architecture.md §0 B1/B2: the pipeline
still uses `PIPELINE_STACK=java-spring+ts-react`. Tests placed under `frontend/` would never be collected
by `npm test -- --run` at the project root, so they would be a false gate. I didn't write them there.

The suggested verification commands (`cd backend && mvn …`, `cd frontend && npm test …`) also fail on `cd`.

## What should happen
Run apicoord with `PIPELINE_STACK=rust-tauri+ts-react` and re-map the qa-engineer lane to:
`tests/task_<id>/**`, `tests/shared/**`, `tests/fixtures/**`, `src/__tests__/tasks/**`,
`src-tauri/core/tests/task_<id>_*.rs`, `src-tauri/tests/task_<id>_*.rs` (architecture.md §2).
Then either re-dispatch QA, or have the orchestrator copy the files below **verbatim**.

## Steps to reproduce
1. As qa-engineer, Write any file under `worktrees/apicoord/t002/tests/` or `worktrees/apicoord/t002/src/__tests__/tasks/`.
2. The hook rejects it with "qa-engineer doesn't own …".

## Where
Ownership hook lane map and `orchestrator/runner_adapter.py` stack default (see architecture.md §0).

## Environment notes (also block running the tests)
- `node_modules/` is absent, so vitest can't run until T002 runs `npm install` (B4).
- `cargo` is not installed on the gate host (B3).

---

## Ready-to-place test files

Why `tests/task_t002/` and not `src/__tests__/`: these tests import `node:fs` / `node:crypto`. tsconfig has
`include: ["src"]` and no `@types/node`, so placing them under `src/` would break `npm run typecheck`
(criterion 2) through the tests themselves. Vitest's default include still collects `tests/**/*.test.ts`.
The §9.2 exclude only drops `tests/fixtures/**`.

### 1. `tests/shared/projectFiles.ts`
```ts
// Cross-task helpers for config/contract tests that read project files.
// Kept outside src/ because tsconfig has no node types.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..')
export const p = (...parts: string[]) => join(ROOT, ...parts)
export const exists = (...parts: string[]) => existsSync(p(...parts))
export const readText = (...parts: string[]) => readFileSync(p(...parts), 'utf8')
export const readBytes = (...parts: string[]) => readFileSync(p(...parts))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = (...parts: string[]): any => JSON.parse(readText(...parts))

/** Recursively list files under a project-relative dir (skips node_modules). */
export function listFiles(dir: string, filter: (f: string) => boolean = () => true): string[] {
  const out: string[] = []
  const walk = (abs: string) => {
    for (const name of readdirSync(abs)) {
      if (name === 'node_modules') continue
      const full = join(abs, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (filter(full)) out.push(full)
    }
  }
  if (existsSync(p(dir))) walk(p(dir))
  return out
}
```

### 2. `tests/task_t002/foundation-config.test.ts`
```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { exists, p, readBytes, readJson, readText, listFiles, ROOT } from '../shared/projectFiles'

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')
const capabilityFiles = () =>
  listFiles('src-tauri/capabilities', f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(f, 'utf8')))

// ── Criterion 1: npm install succeeds, package-lock.json committed ─────────────
describe('C1 package-lock', () => {
  it('package_lock_is_committed_and_resolves_the_pinned_versions', () => {
    expect(exists('package-lock.json'), 'package-lock.json must be committed at the project root').toBe(true)
    const lock = readJson('package-lock.json')
    expect(lock.name).toBe('apicoord')
    const v = (name: string) => lock.packages?.[`node_modules/${name}`]?.version as string | undefined
    expect(v('react'), 'react').toMatch(/^18\.3\./)
    expect(v('react-dom'), 'react-dom').toMatch(/^18\.3\./)
    expect(v('monaco-editor'), 'monaco-editor').toMatch(/^0\.54\./)
    expect(v('monaco-yaml'), 'monaco-yaml').toMatch(/^5\.5\./)
    expect(v('swagger-ui-react'), 'swagger-ui-react').toMatch(/^5\.36\./)
    expect(v('@monaco-editor/react'), '@monaco-editor/react').toMatch(/^4\.7\./)
    expect(v('zustand'), 'zustand').toMatch(/^5\./)
    // lock and package.json agree: the root entry lists the same ranges
    const pkg = readJson('package.json')
    expect(lock.packages[''].dependencies).toEqual(pkg.dependencies)
  })

  it('plugin_fs_and_plugin_dialog_js_packages_are_gone_from_package_json_and_lock', () => {
    const pkg = readJson('package.json')
    const all = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(all).not.toHaveProperty('@tauri-apps/plugin-fs')
    expect(all).not.toHaveProperty('@tauri-apps/plugin-dialog')
    expect(pkg.dependencies.react).toBe('~18.3.1')
    expect(pkg.dependencies['react-dom']).toBe('~18.3.1')
    const lock = readJson('package-lock.json')
    expect(lock.packages).not.toHaveProperty('node_modules/@tauri-apps/plugin-fs')
    expect(lock.packages).not.toHaveProperty('node_modules/@tauri-apps/plugin-dialog')
  })
})

// ── Criterion 2: npm run typecheck runs ───────────────────────────────────────
describe('C2 typecheck', () => {
  it('typecheck_script_is_tsc_b_and_exits_zero', () => {
    const pkg = readJson('package.json')
    expect(pkg.scripts?.typecheck).toBe('tsc -b')
    const tsc = p('node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')
    expect(exists('node_modules', '.bin', 'tsc'), 'run npm install first').toBe(true)
    // throws (with tsc output) on non-zero exit
    execFileSync(tsc, ['-b'], { cwd: ROOT, stdio: 'pipe', timeout: 300_000 })
  }, 320_000)
})

// ── Criterion 3: cargo test (workspace) runs ≥1 test ──────────────────────────
// The real proof is the cargo gate running src-tauri/core/tests/task_t002_schemas.rs (below).
// This test checks the workspace wiring that makes a plain `cargo test` reach the core crate.
describe('C3 cargo workspace', () => {
  it('cargo_workspace_has_core_as_default_member_and_core_has_no_tauri_dep', () => {
    const app = readText('src-tauri/Cargo.toml')
    expect(app).toMatch(/^\[workspace\]/m)
    expect(app).toMatch(/members\s*=\s*\[\s*"core"\s*\]/)
    expect(app).toMatch(/default-members\s*=\s*\[\s*"\."\s*,\s*"core"\s*\]/)
    expect(app).toMatch(/apicoord-core\s*=\s*\{\s*path\s*=\s*"core"/)
    const core = readText('src-tauri/core/Cargo.toml')
    expect(core).toMatch(/name\s*=\s*"apicoord-core"/)
    expect(core).not.toMatch(/^\s*tauri/m)
    expect(core).not.toMatch(/encoding_rs|reqwest|hyper|ureq/)
    expect(listFiles('src-tauri/core/tests', f => f.endsWith('.rs')).length).toBeGreaterThan(0)
  })
})

// ── Criterion 4: npm test -- --run runs ≥1 test ───────────────────────────────
describe('C4 vitest gate', () => {
  it('vitest_config_excludes_fixtures_and_a_real_non_task_test_exists', () => {
    const vite = readText('vite.config.ts')
    expect(vite).toMatch(/exclude[^\]]*tests\/fixtures\/\*\*/s)
    expect(vite).toMatch(/worker\s*:\s*\{\s*format\s*:\s*'es'/)
    expect(readJson('package.json').scripts.test).toMatch(/^vitest/)
    expect(exists('src/__tests__/App.test.tsx')).toBe(true)
  })
})

// ── Criterion 5: webview permissions only core:default, set-title, window-destroy ──
describe('C5 capabilities', () => {
  it('union_of_all_capability_permissions_is_exactly_the_three_allowed', () => {
    const caps = capabilityFiles()
    const perms = new Set(caps.flatMap(c => c.permissions as unknown[]).map(x => (typeof x === 'string' ? x : (x as { identifier: string }).identifier)))
    expect([...perms].sort()).toEqual(['core:default', 'core:window:allow-destroy', 'core:window:allow-set-title'])
    const lifecycle = readJson('src-tauri/capabilities/window-lifecycle.json')
    expect(lifecycle.windows).toEqual(['main'])
    expect(lifecycle.permissions).toEqual(['core:window:allow-destroy'])
    expect(readJson('src-tauri/capabilities/default.json').permissions).toEqual(['core:default', 'core:window:allow-set-title'])
  })

  it('no_fs_http_shell_dialog_anywhere_and_plugin_fs_gone_from_rust_and_frontend', () => {
    for (const c of capabilityFiles()) expect(JSON.stringify(c)).not.toMatch(/"(fs|http|shell|dialog):/)
    expect(readText('src-tauri/Cargo.toml')).not.toMatch(/tauri-plugin-fs/)
    expect(readText('src-tauri/src/lib.rs')).not.toMatch(/tauri_plugin_fs/)
    const offenders = listFiles('src', f => /\.(ts|tsx)$/.test(f))
      .filter(f => /@tauri-apps\/plugin-(fs|dialog)/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

// ── Criterion 6: strict CSP, no remote origins ────────────────────────────────
type Csp = Record<string, string>
const tokens = (csp: Csp) => Object.entries(csp).flatMap(([d, v]) => v.trim().split(/\s+/).map(t => [d, t] as const))
const PROD_ALLOWED = new Set(["'self'", "'none'", 'data:', 'blob:', 'ipc:', 'http://ipc.localhost'])

describe('C6 CSP', () => {
  it('production_csp_is_an_object_with_no_remote_origins_or_script_relaxations', () => {
    const conf = readJson('src-tauri/tauri.conf.json')
    const csp: Csp = conf.app.security.csp
    expect(csp, 'csp must not be null').not.toBeNull()
    expect(typeof csp).toBe('object')
    for (const d of ['default-src', 'script-src', 'connect-src', 'object-src', 'base-uri', 'form-action', 'frame-src'])
      expect(csp, `missing ${d}`).toHaveProperty(d)
    for (const [d, t] of tokens(csp)) {
      if (t === "'unsafe-inline'") { expect(d, "'unsafe-inline' only in style-src").toBe('style-src'); continue }
      expect(PROD_ALLOWED.has(t), `${d}: disallowed source ${t}`).toBe(true)
    }
    expect(csp['script-src']).toBe("'self'")
    expect(csp['connect-src']).toBe('ipc: http://ipc.localhost')
    expect(csp['object-src']).toBe("'none'")
    expect(conf.app.windows[0].label).toBe('main')
  })

  it('dev_csp_only_adds_the_local_vite_websocket', () => {
    const csp: Csp = readJson('src-tauri/tauri.conf.json').app.security.devCsp
    expect(csp).toBeTruthy()
    for (const [d, t] of tokens(csp)) {
      if (t === "'unsafe-inline'") { expect(d).toBe('style-src'); continue }
      if (t === 'ws://localhost:1420') { expect(d).toBe('connect-src'); continue }
      expect(PROD_ALLOWED.has(t), `devCsp ${d}: disallowed source ${t}`).toBe(true)
    }
    expect(csp['script-src']).toBe("'self'")
  })
})

// ── Criterion 7: vendored schema sha256 matches §9.5 ──────────────────────────
describe('C7 vendored schemas', () => {
  it('oas_3_0_schema_sha256_matches_recorded_value', () => {
    expect(sha256(readBytes('src-tauri/core/schemas/oas-3.0.json')))
      .toBe('7a0db7311a69d8b7f2505f59c5d4cbb58539a0961df0c05724a07538014822cf')
  })
  it('oas_3_1_schema_sha256_matches_recorded_value', () => {
    expect(sha256(readBytes('src-tauri/core/schemas/oas-3.1.json')))
      .toBe('da01ba28852cac0de53893797cb8d1942bc3b05084f526dcc216717dec314ed0')
  })
})
```

### 3. `src-tauri/core/tests/task_t002_schemas.rs` (gives the cargo gate ≥1 real test, needs only rustup)
```rust
//! T002: the core crate builds in the workspace and the bundled schemas are usable offline.
const OAS30: &str = include_str!("../schemas/oas-3.0.json");
const OAS31: &str = include_str!("../schemas/oas-3.1.json");

#[test]
fn bundled_oas_schemas_parse_and_declare_expected_drafts() {
    let v30: serde_json::Value = serde_json::from_str(OAS30).expect("oas-3.0.json is valid JSON");
    let v31: serde_json::Value = serde_json::from_str(OAS31).expect("oas-3.1.json is valid JSON");
    assert_eq!(v30["$schema"], "http://json-schema.org/draft-04/schema#");
    assert_eq!(v31["$schema"], "https://json-schema.org/draft/2020-12/schema");
}

fn collect_refs(v: &serde_json::Value, out: &mut Vec<String>) {
    match v {
        serde_json::Value::Object(m) => {
            for (k, val) in m {
                if k == "$ref" { if let Some(s) = val.as_str() { out.push(s.to_owned()); } }
                collect_refs(val, out);
            }
        }
        serde_json::Value::Array(a) => a.iter().for_each(|x| collect_refs(x, out)),
        _ => {}
    }
}

#[test]
fn bundled_schemas_have_no_remote_refs() {
    for (name, text) in [("3.0", OAS30), ("3.1", OAS31)] {
        let v: serde_json::Value = serde_json::from_str(text).unwrap();
        let mut refs = Vec::new();
        collect_refs(&v, &mut refs);
        assert!(!refs.is_empty(), "oas-{name}: expected local $refs");
        for r in refs {
            assert!(r.starts_with('#'), "oas-{name} has a non-local $ref: {r}");
        }
    }
}
```
