import { call } from './invoke'

/** Exits the app. Call only after the dirty guard passed. */
export function exitApp(): Promise<void> {
  return call<void>('exit_app')
}
