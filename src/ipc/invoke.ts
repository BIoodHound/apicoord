import { invoke } from '@tauri-apps/api/core'

/**
 * Thin typed call. Tauri rejects with the serialised `AppError` object (`{code, message}`);
 * it is rethrown unchanged so callers can narrow it with `isAppError`.
 * Lives in its own module so the command modules export only command wrappers.
 */
export function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return args === undefined ? invoke<T>(cmd) : invoke<T>(cmd, args)
}
