import { call } from './invoke'
import type { RecentEntry } from './types'

/** Most recent first, at most 5. */
export function listRecent(): Promise<RecentEntry[]> {
  return call<RecentEntry[]>('list_recent')
}
