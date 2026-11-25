import type { Language } from '../../state/store'

/**
 * Language from the file name (m1-editor): .yaml/.yml → yaml, .json → json.
 * Any other extension: first non-blank character `{` → json, else yaml.
 */
export function detectLanguage(fileName: string, text: string): Language {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  if (lower.endsWith('.json')) return 'json'
  return /^\s*\{/.test(text) ? 'json' : 'yaml'
}
