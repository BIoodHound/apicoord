import { call } from './invoke'

/** `ping` — proves the Rust side is reachable. */
export function ping(): Promise<string> {
  return call<string>('ping')
}
