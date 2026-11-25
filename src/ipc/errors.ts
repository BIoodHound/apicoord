import type { AppError, AppErrorCode } from './types'

const APP_ERROR_CODES: readonly AppErrorCode[] = [
  'unsupported_encoding', 'not_issued', 'not_found', 'no_document', 'locked', 'io_error', 'internal',
]

/** Narrows an `invoke` rejection to the contract's `{code, message}` error object. */
export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { code?: unknown; message?: unknown }
  return (
    typeof v.code === 'string' &&
    (APP_ERROR_CODES as readonly string[]).includes(v.code) &&
    typeof v.message === 'string'
  )
}

/** User-facing message for any rejection; never JSON-stringifies. */
export function errorMessage(value: unknown): string {
  if (isAppError(value)) return value.message
  if (value instanceof Error) return value.message
  return 'Something went wrong.'
}
