// T014 gate tests: Windows release build + manual QA runbook (no CI runner).
//
// Contract (what the release-engineer must provide):
//   - exactly one Markdown runbook under packaging/ whose file name contains "runbook"
//     (case-insensitive), e.g. packaging/RELEASE-RUNBOOK.md
//   - it holds: a clean-checkout Windows release build, a manual QA checklist covering
//     every m1 spec, the perf gate, and a git procedure (fast-forward to main, never
//     force-push, never re-init)
//   - no workflow files under .github/workflows/
//
// These tests read documents only. They are collected by the project-root gate
// `npm test -- --run` (the root vite config has no `include`, so vitest's default
// `**/*.test.ts` picks up frontend/src/__tests__/tasks/**).
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// frontend/src/__tests__/tasks/task_t014 → project root
const ROOT = resolve(__dirname, '..', '..', '..', '..', '..')
const PACKAGING = join(ROOT, 'packaging')

function findRunbooks(): string[] {
  if (!existsSync(PACKAGING)) return []
  const out: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/runbook/i.test(name) && name.toLowerCase().endsWith('.md')) out.push(p)
    }
  }
  walk(PACKAGING)
  return out
}

function runbook(): string {
  const found = findRunbooks()
  expect(found, 'expected exactly one packaging/**/*runbook*.md').toHaveLength(1)
  return readFileSync(found[0], 'utf8').replace(/\r\n/g, '\n')
}

/** Paragraphs (blank-line separated) plus individual lines, for co-location checks. */
function chunks(doc: string): string[] {
  return [...doc.split(/\n\s*\n/), ...doc.split('\n')]
}

function hasChunk(doc: string, ...patterns: RegExp[]): boolean {
  return chunks(doc).some((c) => patterns.every((p) => p.test(c)))
}

/** Lines inside fenced code blocks: the commands a person would actually type. */
function codeLines(doc: string): string[] {
  const lines: string[] = []
  let inFence = false
  for (const line of doc.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue }
    if (inFence) lines.push(line.trim())
  }
  return lines
}

function missing(doc: string, terms: (string | RegExp)[]): string[] {
  return terms
    .filter((t) => (typeof t === 'string' ? !doc.toLowerCase().includes(t.toLowerCase()) : !t.test(doc)))
    .map(String)
}

describe('T014 criterion 1: Windows release build from a clean checkout', () => {
  it('runbook_builds_release_binary_from_clean_checkout', () => {
    const doc = runbook()
    const code = codeLines(doc).join('\n')
    expect(code, 'clone of the repo from a clean checkout').toMatch(/git clone\s+\S*github\.com[/:]BIoodHound\/apicoord/)
    expect(code, 'lockfile-exact install').toMatch(/\bnpm ci\b/)
    expect(code, 'release build command').toMatch(/(cargo tauri build|npm run tauri(?: --)? build|npx tauri build)/)
    expect(code, 'release build must not be a debug build').not.toMatch(/tauri(?: --)? build[^\n]*--debug/)
    expect(doc, 'where the release artefacts land').toMatch(/src-tauri[\\/]target[\\/]release[\\/]bundle/)
    expect(missing(doc, [/\bmsi\b/i, /\bnsis\b/i])).toEqual([])
  })

  it('runbook_lists_windows_prerequisites_and_runs_gate_before_build', () => {
    const doc = runbook()
    expect(missing(doc, [/rustup|rust toolchain/i, /node(\.js)?\b/i, /webview2/i,
      /msvc|visual studio build tools|c\+\+ build tools/i])).toEqual([])
    const code = codeLines(doc).join('\n')
    expect(code).toContain('cargo test --manifest-path src-tauri/Cargo.toml')
    expect(code).toMatch(/npm test -- --run/)
  })
})

describe('T014 criterion 2: checklist covers every m1 acceptance area', () => {
  it('checklist_uses_every_m1_fixture', () => {
    const doc = runbook()
    const fixtures = [
      'petstore-3.0.yaml', 'petstore-3.1.yaml', 'big-10k.yaml',
      'eol-lf.yaml', 'eol-crlf.yaml', 'eol-mixed.yaml', 'utf8-bom.yaml', 'utf16le.yaml', 'no-final-newline.yaml',
      'non-object.yaml', 'invalid-on-open.yaml', 'schema-invalid.yaml', 'legacy-latin1.yaml',
    ]
    expect(missing(doc, fixtures)).toEqual([])
  })

  it('checklist_covers_each_m1_spec_area', () => {
    const doc = runbook()
    const areas: Record<string, (string | RegExp)[]> = {
      'm1-file-io': [/byte-identical/i, 'Save As', /UTF-16LE/i, /\bBOM\b/, /CRLF/, /mixed line endings/i,
        /locked|read-only/i, "isn't UTF-8 or UTF-16"],
      'm1-editor': [/override/i, /undo/i, /extensionless|no extension/i, /\bLn\b[^\n]{0,8}\bCol\b/i, /light|dark/i],
      'm1-preview': [/out of date/i, 'Fix the syntax error to see a preview', /Try it out/i, /comment-only|comment only/i],
      'm1-validation': [/squiggle/i, /300\s*ms/i, /schemas[\\/]oas-3\.[01]\.json/i, /corrupt|delete/i, /problems/i],
      'm1-menu-lifecycle': ['Recent', "Don't Save", 'Cancel', 'no longer exists', /restart/i, /Ctrl\+S/, /Ctrl\+O/,
        /Ctrl\+W/, /Ctrl\+Shift\+S/, /exactly one|once/i, /•/],
      'm1-foundation': [/spike/i, /CSP/, /no network|offline|network blocked/i],
    }
    const gaps = Object.entries(areas)
      .map(([spec, terms]) => [spec, missing(doc, terms)] as const)
      .filter(([, m]) => m.length > 0)
    expect(gaps, 'spec areas with checklist gaps').toEqual([])
    // Items are tickable checklist entries, not prose.
    expect((doc.match(/^\s*[-*] \[ \]/gm) ?? []).length).toBeGreaterThanOrEqual(25)
  })
})

describe('T014 criterion 3: perf gate', () => {
  it('perf_gate_p95_under_250ms_for_petstore_and_big10k_and_miss_holds_increment', () => {
    const doc = runbook()
    expect(hasChunk(doc, /p95/i, /250\s*ms/i, /petstore/i, /big-10k/i),
      'p95 < 250ms stated for both fixtures together').toBe(true)
    expect(hasChunk(doc, /(miss|fail|exceed|over)/i, /hold/i, /increment/i), 'a miss holds the increment').toBe(true)
    expect(doc, 'harness marks named').toMatch(/apicoord:ks/)
    expect(doc).toMatch(/apicoord:commit/)
    expect(hasChunk(doc, /release/i, /(binary|build|installer)/i, /(harness|perf|p95)/i),
      'measured on the release build').toBe(true)
  })

  it('perf_gate_offers_no_debounce_fallback', () => {
    const doc = runbook()
    // architecture §6.3 / D3: the 400ms-above-5,000-lines fallback is void.
    expect(doc).not.toMatch(/400\s*ms/i)
    expect(hasChunk(doc, /(ship|accept|pass)/i, /(longer|increase[sd]?|raise[sd]?) (the )?debounce/i)).toBe(false)
  })
})

describe('T014 criterion 4: git procedure', () => {
  it('git_section_requires_fast_forward_to_main_and_forbids_force_push_and_reinit', () => {
    const doc = runbook()
    expect(doc).toMatch(/BIoodHound\/apicoord/)
    expect(codeLines(doc).join('\n'), 'fast-forward only').toMatch(/--ff-only/)
    expect(hasChunk(doc, /(never|do not|don't|must not|forbidden|prohibited|not allowed)/i, /force[- ]push|--force/i),
      'explicit force-push prohibition').toBe(true)
    expect(hasChunk(doc, /(never|do not|don't|must not|forbidden|prohibited|not allowed)/i, /re-?init|git init/i),
      'explicit re-init prohibition').toBe(true)
  })

  it('runbook_commands_never_force_push_or_reinit', () => {
    const doc = runbook()
    const bad = codeLines(doc).filter(
      (l) => /git push\b.*(\s-f\b|--force|\s\+\w)/.test(l) || /^git init\b/.test(l) ||
        /\brm -rf? \.git\b|Remove-Item[^\n]*\.git\b/.test(l) || /git reset --hard origin/.test(l),
    )
    expect(bad).toEqual([])
  })
})

describe('T014 criterion 5: no CI workflow', () => {
  it('no_github_workflow_is_added', () => {
    // Regression guard: green today, must stay green after the task.
    const dir = join(ROOT, '.github', 'workflows')
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f)) : []
    expect(files).toEqual([])
  })
})
