import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Default mock for Tauri invoke so component tests don't try to talk to a real backend.
// Overrides per-test via `vi.mocked` on `@tauri-apps/api/core`.
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (_cmd: string, _args?: unknown) => {
    return undefined
  }),
}))
