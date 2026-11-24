# M1 — Editor pane and status bar

**Research:** `monaco-in-tauri.md`, `text-file-roundtrip.md`. **Decision:** council m1 #9, #11, rule 5. **Departure:** `monaco-in-tauri.md` suggests `vite-plugin-monaco-editor-esm` and `enableSchemaRequest`; the council rejected both (barely maintained / needs HTTP). We use `?worker` imports and local `monaco-editor`.

## Goal
A fast Monaco editor with correct language mode, offline, and a status bar that tells the truth about the document.

## User-visible behaviour
- Left pane is Monaco (lazy-loaded; a "loading editor…" placeholder shows until ready). Right pane is the preview. Draggable splitter, default 50/50.
- Language: `.yaml`/`.yml` → YAML, `.json` → JSON. Any other extension: first non-blank character `{` → JSON, else YAML.
- Status bar (left→right): language dropdown (YAML/JSON), encoding (+BOM), EOL, preview status (`m1-preview`), marker count ("3 problems"), cursor `Ln, Col`.
- Language override is **session-only**, does not change saved bytes, survives Save As, and resets when another file is opened. Switching it re-runs parse and schema binding in one step without recreating the model (undo history and markers are kept).
- Dirty marker appears on first edit and clears on save or when text returns to the saved text.
- Theme follows system light/dark.

## API shape
None (frontend only; consumes `OpenedSpec`).

## Data
Store `document` slice; no persistence.

## Acceptance criteria
- Monaco loads with no network (test with network blocked; no jsDelivr request).
- Workers load in both `tauri dev` and the packaged build: syntax highlighting works and a schema squiggle appears.
- Extension detection table above passes, including an extensionless file starting with `{` (JSON) and one starting with `openapi:` (YAML).
- Override YAML→JSON on a YAML buffer changes the mode and triggers exactly one re-parse; model identity and undo stack are preserved.
- Opening `big-10k.yaml`: UI stays responsive (a typed key echoes within 100ms while highlighting finishes) — manual on Windows.
- Open Petstore 3.1 → editor text visible in <200ms from file chosen (manual on Windows, recorded).
- Status bar shows correct encoding/EOL for each fixture.

## Non-goals
Persisted override; settings UI; minimap/theme options; jump-to-line from preview (Increment 2); find in preview.

## Open questions for the operator
None new.
