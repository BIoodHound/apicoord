// Parse worker message protocol (architecture §6.2, §12).

export interface ParseRequest {
  seq: number
  text: string
  language: 'yaml' | 'json'
}

export type ParseReply =
  | { seq: number; ok: true; hash: string; json: Record<string, unknown> }
  | { seq: number; ok: false; line: number; message: string }
