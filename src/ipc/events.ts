import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { MenuEvent, RecentEntry } from './types'

/** Subscribes to native menu activations. Returns the unlisten function. */
export function onMenuAction(cb: (event: MenuEvent) => void): Promise<UnlistenFn> {
  return listen<MenuEvent>('menu://action', (e) => cb(e.payload))
}

/** Subscribes to MRU changes. Returns the unlisten function. */
export function onRecentChanged(cb: (entries: RecentEntry[]) => void): Promise<UnlistenFn> {
  return listen<RecentEntry[]>('recent://changed', (e) => cb(e.payload))
}
