import { call } from './invoke'
import type { OpenApiVersion } from './types'

/** Returns the OpenAPI JSON schema text for `version` (bundled, copied to app_data_dir). */
export function getSchema(version: OpenApiVersion): Promise<string> {
  return call<string>('get_schema', { version })
}
