// @vitest-environment node
/**
 * T001 gate — design/ipc-contract.md must mirror architecture.md §5 verbatim,
 * and architecture.md must reflect the m1 decisions (bundled schemas, no remote fetch).
 *
 * Document-contract tests: they read the two design files from disk and assert on
 * their content. No app code is involved.
 *
 * Location note: the ownership hook only lets QA write under frontend/src/__tests__/tasks/**,
 * although this repo has no frontend/ dir (architecture §0 B1/B2). Vitest's default include
 * (**\/*.test.ts) still discovers this file when run from the project root, and the project
 * root is located by walking up to design/architecture.md, so the file can move to
 * src/__tests__/tasks/task_t001/ unchanged once the lanes are re-mapped.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function projectRoot(): string {
  let dir = __dirname
  while (!existsSync(resolve(dir, 'design/architecture.md'))) {
    const up = dirname(dir)
    if (up === dir) throw new Error('could not find design/architecture.md above ' + __dirname)
    dir = up
  }
  return dir
}
const ROOT = projectRoot()

const read = (rel: string) =>
  readFileSync(resolve(ROOT, rel), 'utf8')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')

const ARCH = read('design/architecture.md')
const CONTRACT = read('design/ipc-contract.md')

const EXPECTED_COMMANDS = [
  'ping',
  'open_spec_dialog',
  'open_recent',
  'save_spec',
  'save_spec_as',
  'close_document',
  'list_recent',
  'get_schema',
  'exit_app',
].sort()
const EXPECTED_EVENTS = ['menu://action', 'recent://changed'].sort()

/** §5 of architecture.md: from the "## 5." heading up to (not including) the "## 6." heading. */
function archSection5(): string {
  const start = ARCH.search(/^## 5\. /m)
  const end = ARCH.search(/^## 6\. /m)
  expect(start, 'architecture.md has a "## 5." heading').toBeGreaterThanOrEqual(0)
  expect(end, 'architecture.md has a "## 6." heading after §5').toBeGreaterThan(start)
  return ARCH.slice(start, end).trim()
}

/** All markdown table rows in `md` as arrays of trimmed cells. Escaped pipes (\|) stay inside a cell. */
function tableRows(md: string): string[][] {
  return md
    .split('\n')
    .filter((l) => /^\|.*\|$/.test(l.trim()))
    .map((l) =>
      l
        .trim()
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((c) => c.trim()),
    )
}

const backticked = (re: RegExp) => (cell: string) => {
  const m = /^`([^`]+)`$/.exec(cell)
  return m && re.test(m[1]) ? m[1] : null
}
const asCommand = backticked(/^[a-z][a-z0-9_]*$/)
const asEvent = backticked(/^[a-z]+:\/\/[a-z-]+$/)

function contractCommandRows(): Map<string, string[]> {
  const rows = new Map<string, string[]>()
  for (const r of tableRows(CONTRACT)) {
    const name = asCommand(r[0])
    if (name) {
      expect(rows.has(name), `command "${name}" is listed more than once in ipc-contract.md`).toBe(false)
      rows.set(name, r)
    }
  }
  return rows
}

describe('T001 — ipc-contract.md mirrors architecture.md §5', () => {
  // Criterion 1
  it('ipc_contract_contains_architecture_section_5_verbatim', () => {
    const section = archSection5()
    expect(
      CONTRACT.includes(section),
      'design/ipc-contract.md must contain architecture.md §5 (from "## 5." up to "## 6.") verbatim',
    ).toBe(true)
  })

  // Criterion 1 (edge: "replace", not "append") — the old placeholder contract is gone
  it('ipc_contract_has_no_leftover_placeholder_tables', () => {
    expect(CONTRACT).not.toMatch(/Add real commands as they're introduced/)
    expect(CONTRACT).not.toMatch(/^\| Command \| Args \| Returns \| Errors \| Capability \|$/m)
  })

  // Criterion 2
  it('contract_lists_exactly_9_commands', () => {
    expect([...contractCommandRows().keys()].sort()).toEqual(EXPECTED_COMMANDS)
  })

  // Criterion 2
  it('contract_lists_exactly_2_events', () => {
    const events = new Set<string>()
    for (const r of tableRows(CONTRACT)) {
      const name = asEvent(r[0])
      if (name) events.add(name)
    }
    expect([...events].sort()).toEqual(EXPECTED_EVENTS)
  })

  // Criterion 3
  it('only_open_recent_takes_a_path_argument', () => {
    const rows = contractCommandRows()
    expect(rows.size, 'command table must be present').toBeGreaterThan(0)
    const withPath = [...rows.entries()]
      .filter(([, cells]) => /\bpath\b/.test(cells[1] ?? ''))
      .map(([name]) => name)
    expect(withPath).toEqual(['open_recent'])
    expect(rows.get('open_recent')?.[1]).toMatch(/\{\s*path:\s*string\s*\}/)
  })

  // Criterion 3 (edge named in the task: the allow-list rule itself is stated)
  it('allow_list_rule_is_stated_in_contract', () => {
    expect(CONTRACT).toMatch(/the only command that takes a path is `open_recent`/i)
    expect(CONTRACT).toMatch(/must already be in `issued`/)
  })
})

describe('T001 — architecture.md reflects m1 decisions (bundled schemas, no remote fetch)', () => {
  // Criterion 4
  it('architecture_disables_every_schema_request_and_bundles_schemas', () => {
    const flags = [...ARCH.matchAll(/enableSchemaRequest:\s*(\w+)/g)].map((m) => m[1])
    expect(flags.length, 'monaco-yaml / json config must set enableSchemaRequest').toBeGreaterThan(0)
    expect(flags.every((v) => v === 'false')).toBe(true)
    expect(ARCH).toMatch(/include_str!/)
    expect(ARCH).not.toMatch(/\bfetch\s*\(/)
  })

  // Criterion 4 (edge: the only remote URLs are the one-time authoring-time schema sources in §9.5)
  it('architecture_remote_urls_are_authoring_time_schema_sources_only', () => {
    const urls = [...ARCH.matchAll(/https?:\/\/[^\s`"')]+/g)].map((m) => m[0])
    const remote = urls.filter((u) => !/^https?:\/\/(ipc\.)?localhost\b/.test(u))
    const unexpected = remote.filter((u) => !u.startsWith('https://spec.openapis.org/oas/'))
    expect(unexpected, 'remote URLs other than the §9.5 schema sources').toEqual([])
    expect(ARCH).toMatch(/one-time download at authoring time; the app makes no network calls at runtime/)
  })
})
