import { invoke } from '@tauri-apps/api/core'

/**
 * Starter IPC wrapper. Proves the Rust side is reachable.
 * Replace with real wrappers (one per command in design/ipc-contract.md) during Increment 1.
 */
export async function ping(): Promise<string> {
  return invoke<string>('ping')
}
