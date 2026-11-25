/**
 * T004 gate — TS skeletons: IPC boundary types + typed invoke wrappers, Zustand store,
 * fileActions dispatcher, parse-worker protocol, perf marks.
 *
 * Contract sources: design/ipc-contract.md (= architecture.md §5), architecture.md §6.1, §6.3, §12.
 *
 * Location note: same as task_t001 — the ownership hook only lets QA write under
 * frontend/src/__tests__/tasks/**, and Vitest run from the project root discovers this file.
 * The project root is found by walking up to design/architecture.md and app modules are
 * imported by absolute path, so the file can move to src/__tests__/tasks/task_t004/ unchanged.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mocks: every IPC wrapper must go through these two Tauri entry points.
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

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
const readText = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8').replace(/\r\n?/g, '\n')
type Mod = Record<string, unknown>
const load = (rel: string): Promise<Mod> => import(/* @vite-ignore */ resolve(ROOT, rel))

const COMMANDS = [
  'ping', 'open_spec_dialog', 'open_recent', 'save_spec', 'save_spec_as',
  'close_document', 'list_recent', 'get_schema', 'exit_app',
]
const EVENTS = ['menu://action', 'recent://changed']
const IPC_MODULES = ['src/ipc/health.ts', 'src/ipc/file.ts', 'src/ipc/recent.ts', 'src/ipc/schema.ts', 'src/ipc/app.ts']

// ---- tiny TS declaration reader (text level; enough for the flat §5.3 shapes) ----
interface Decl { kind: 'type' | 'interface'; literals: string[]; fields: string[] }
function readDecls(src: string): Map<string, Decl> {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const out = new Map<string, Decl>()
  for (const chunk of code.split(/\bexport\s+/).slice(1)) {
    const t = /^type\s+(\w+)\s*=([\s\S]*)/.exec(chunk)
    if (t) {
      const lits = [...t[2].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]).sort()
      out.set(t[1], { kind: 'type', literals: lits, fields: [] })
      continue
    }
    const i = /^interface\s+(\w+)[^{]*\{([^}]*)\}/.exec(chunk)
    if (i) {
      const fields = [...i[2].matchAll(/(\w+)(\??)\s*:/g)].map((m) => m[1] + m[2]).sort()
      out.set(i[1], { kind: 'interface', literals: [], fields })
    }
  }
  return out
}

/** Calls every exported function of the IPC modules, positionally and with a named-args object. */
async function callAllWrappers(): Promise<{ fn: string; error: unknown; threw: boolean }[]> {
  const results: { fn: string; error: unknown; threw: boolean }[] = []
  const named = { path: '3.1', text: '3.1', clean: false, version: '3.1' }
  for (const rel of IPC_MODULES) {
    const mod = await load(rel)
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value !== 'function') continue
      for (const args of [['3.1', false], [named]]) {
        try {
          await (value as (...a: unknown[]) => unknown)(...args)
          results.push({ fn: `${rel}#${name}`, error: undefined, threw: false })
        } catch (e) {
          results.push({ fn: `${rel}#${name}`, error: e, threw: true })
        }
      }
    }
  }
  return results
}

beforeEach(() => {
  vi.mocked(invoke).mockReset()
  vi.mocked(listen).mockReset()
  vi.mocked(listen).mockImplementation(async () => () => {})
})
afterEach(() => vi.restoreAllMocks())

describe('T004 — TS skeletons', () => {
  // Criterion 1: npm run typecheck passes (also run by the gate itself).
  it(
    'npm_run_typecheck_is_defined_as_tsc_b_and_passes',
    () => {
      const pkg = JSON.parse(readText('package.json')) as { scripts?: Record<string, string> }
      expect(pkg.scripts?.typecheck, 'package.json scripts.typecheck (architecture §9.1)').toBe('tsc -b')
      let output = ''
      try {
        execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' })
      } catch (e) {
        const err = e as { stdout?: string; stderr?: string }
        output = `${err.stdout ?? ''}${err.stderr ?? ''}`
      }
      expect(output, 'tsc -b reported errors').toBe('')
    },
    240_000,
  )

  // Criterion 2: src/ipc/types.ts mirrors the §5.3 TS block of design/ipc-contract.md.
  it('ipc_types_declare_every_contract_type_with_identical_members', () => {
    const block = /```ts\n([\s\S]*?)```/.exec(readText('design/ipc-contract.md'))
    expect(block, 'ipc-contract.md has a ```ts block (§5.3)').not.toBeNull()
    const expected = readDecls(block![1])
    expect([...expected.keys()].length).toBeGreaterThanOrEqual(9)

    expect(existsSync(resolve(ROOT, 'src/ipc/types.ts')), 'src/ipc/types.ts exists').toBe(true)
    const actual = readDecls(readText('src/ipc/types.ts'))
    for (const [name, decl] of expected) {
      const got = actual.get(name)
      expect(got, `types.ts exports ${name}`).toBeDefined()
      expect(got!.kind, `${name} is a ${decl.kind}`).toBe(decl.kind)
      if (decl.kind === 'type') expect(got!.literals, `${name} union members`).toEqual(decl.literals)
      else expect(got!.fields, `${name} fields (name + optionality)`).toEqual(decl.fields)
    }
    // MenuAction is defined in §5.2 prose rather than the TS block.
    expect(actual.get('MenuAction')?.literals, 'MenuAction union (§5.2)').toEqual(
      ['close', 'exit', 'open', 'recent', 'save', 'save-as'],
    )
  })

  // Criterion 2: typed wrappers exist for every §5.1 command, with the contract arg names.
  it('ipc_wrappers_invoke_every_contract_command_with_camelcase_args', async () => {
    vi.mocked(invoke).mockResolvedValue(null)
    await callAllWrappers()
    const calls = vi.mocked(invoke).mock.calls.map(([cmd, args]) => ({ cmd, args: (args ?? {}) as Record<string, unknown> }))
    const names = [...new Set(calls.map((c) => c.cmd))].sort()
    expect(names).toEqual([...COMMANDS].sort())
    const some = (cmd: string, want: Record<string, unknown>) =>
      calls.some((c) => c.cmd === cmd && Object.entries(want).every(([k, v]) => c.args[k] === v))
    expect(some('open_recent', { path: '3.1' }), 'open_recent sends { path }').toBe(true)
    expect(some('save_spec', { text: '3.1', clean: false }), 'save_spec sends { text, clean }').toBe(true)
    expect(some('save_spec_as', { text: '3.1', clean: false }), 'save_spec_as sends { text, clean }').toBe(true)
    expect(some('get_schema', { version: '3.1' }), 'get_schema sends { version }').toBe(true)
  })

  // Criterion 2 (edge named in §5.3): invoke rejects with an object; wrappers rethrow it as AppError.
  it('ipc_wrappers_reject_with_the_app_error_object_code_and_message', async () => {
    const appError = { code: 'locked', message: 'The file is locked by another program.' }
    vi.mocked(invoke).mockRejectedValue(appError)
    const results = (await callAllWrappers()).filter((r) => r.threw)
    expect(results.length, 'wrappers propagate invoke rejections').toBeGreaterThanOrEqual(COMMANDS.length)
    for (const r of results) expect(r.error, r.fn).toMatchObject(appError)
  })

  // Criterion 2: event helpers subscribe to exactly the two §5.2 events.
  it('ipc_event_helpers_listen_to_menu_action_and_recent_changed', async () => {
    const mod = await load('src/ipc/events.ts')
    for (const value of Object.values(mod)) {
      if (typeof value === 'function') await (value as (cb: () => void) => unknown)(() => {})
    }
    const names = [...new Set(vi.mocked(listen).mock.calls.map(([ev]) => ev))].sort()
    expect(names).toEqual([...EVENTS].sort())
  })

  // Criterion 3: perf marks (names fixed by §6.3).
  it('markKeystroke_emits_apicoord_ks_performance_mark', async () => {
    const spy = vi.spyOn(performance, 'mark')
    const { markKeystroke } = await load('src/perf/marks.ts')
    ;(markKeystroke as () => void)()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toBe('apicoord:ks')
  })

  it('markCommit_emits_apicoord_commit_with_seq_detail', async () => {
    const spy = vi.spyOn(performance, 'mark')
    const { markCommit } = await load('src/perf/marks.ts')
    ;(markCommit as (seq: number) => void)(42)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('apicoord:commit', expect.objectContaining({ detail: { seq: 42 } }))
  })

  // Criterion 4: store, fileActions and protocol skeletons load and have the §6.1 / §12 shape.
  it('store_fileActions_and_parse_protocol_skeletons_have_contract_shape', async () => {
    const { useStore } = await load('src/state/store.ts')
    const state = (useStore as { getState: () => Record<string, unknown> }).getState()
    expect(state).toMatchObject({
      doc: null,
      languageOverridden: false,
      dirty: false,
      previewStatus: { kind: 'none' },
      spec: null,
      specHash: null,
      markerCount: 0,
      recent: [],
      notice: null,
    })
    expect(['yaml', 'json']).toContain(state.language)
    expect(state).toHaveProperty('savedVersionId')
    expect(state).toHaveProperty('lastSeq')
    expect(state).toHaveProperty('cursor')

    const { fileActions } = await load('src/features/file/fileActions.ts')
    for (const m of ['open', 'openRecent', 'save', 'saveAs', 'close', 'exit', 'windowClose', 'confirmDiscardIfDirty']) {
      expect(typeof (fileActions as Record<string, unknown>)[m], `fileActions.${m}`).toBe('function')
    }

    const protocol = readDecls(readText('src/features/preview/protocol.ts'))
    expect(protocol.get('ParseRequest')?.fields).toEqual(['language', 'seq', 'text'])
    expect(protocol.has('ParseReply'), 'protocol.ts exports ParseReply').toBe(true)
  })
})
