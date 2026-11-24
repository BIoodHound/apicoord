# M1 — Schema validation with bundled OpenAPI schemas

**Research:** `cached-remote-schema-offline.md`, `monaco-in-tauri.md`, `tauri-capabilities.md`. **Decision:** council m1 #3, rules 6, 7. **Departures (need operator sign-off):** the brief and the operator goal say "fetch 3.1 schema once, cache in `app_data_dir`" and validate against 3.1. The council cut the network fetch (frozen 2022 snapshot; avoids reqwest/TLS/cache-corruption/toggle) and bundles both 3.0 and 3.1, copied to `app_data_dir/schemas/` on first run. The research brief's `enableSchemaRequest` + `http:default` setup is rejected.

## Goal
Red squiggles for spec violations, offline, against the right OpenAPI schema version, on by default.

## User-visible behaviour
- Validation is on by default. Violations show red squiggles with hover messages; the status bar shows the problem count.
- A 3.0.x file validates against the 3.0 schema; a 3.1.x file against 3.1. A file with a missing/unknown `openapi:` value validates against 3.1 and gets the schema's own error on that field.
- Syntax errors squiggle as well (Monaco/monaco-yaml parse diagnostics); typing a syntax error shows a squiggle within 300ms and fixing it clears it.
- Works for YAML (monaco-yaml) and JSON (`jsonDefaults`). Switching language override rebinds the schema.
- No network is touched at any point.

## API shape
`get_schema(version: "3.0" | "3.1") -> String` (schema JSON text, from `app_data_dir/schemas/` or bundled fallback). `OpenedSpec.openapiVersion` is sniffed in Rust from the `openapi:` field.

## Data
`app_data_dir/schemas/oas-3.0.json`, `oas-3.1.json` (copied from resources on first run; JSON-parse checked on every read, fall back to bundled on corruption, rewrite copy).

## Tuning numbers
Squiggle latency target <300ms after typing stops (brief acceptance). No extra debounce beyond monaco-yaml's own.

## Acceptance criteria
- `petstore-3.0.yaml` shows 0 markers; `petstore-3.1.yaml` shows 0 markers; a 3.0 file never gets a line-1 "3.1" version error.
- `schema-invalid.yaml` shows ≥1 marker at the offending line (also in the 3.1 spike for `$dynamicRef`; if gaps exist, list them in Known limitations).
- Syntax error → squiggle <300ms; fix → cleared.
- Schema passed inline; webview makes no HTTP request and has no `http:*` capability (test asserts capability files).
- Deleting/corrupting `app_data_dir/schemas/*` → app still validates (fallback) and restores the copy.
- Validation works in dev and packaged builds.

## Non-goals
Remote fetch/refresh; settings toggle to disable (nothing to disable in M1); custom user schemas; autocomplete beyond what monaco-yaml gives for free; reader-file warnings (Increment 2); linting rules beyond the schema.

## Open questions for the operator
- Drop the remote schema fetch (Option A, assumed) vs keep a `reqwest` fetch with bundled fallback (B)?
