# APICoord M1 — Windows release build and manual QA runbook

There is no CI runner this increment, and no `.github/workflows` file is added. A person runs this runbook on a Windows 10 1809+ machine. Every box below must be ticked before M1 is handed to the operator.

## 1. Prerequisites (Windows)

- Rust toolchain via rustup (stable, MSVC target `x86_64-pc-windows-msvc`).
- MSVC: Visual Studio Build Tools with the "Desktop development with C++" workload (C++ build tools, Windows SDK).
- Node.js 20 LTS or newer (npm included).
- Microsoft Edge WebView2 Runtime (preinstalled on current Windows 10/11; install the Evergreen runtime otherwise).
- Git for Windows. WiX Toolset and NSIS are downloaded by the Tauri bundler on first build, so the machine needs internet access for that first build only.

## 2. Build a release binary from a clean checkout

Use a fresh folder. Do not reuse a working tree that has local edits or stale `node_modules`/`target` directories.

```powershell
git clone https://github.com/BIoodHound/apicoord
cd apicoord
npm ci
```

Run the gate before building. Both commands must be green:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
npm test -- --run
npm run typecheck
```

Then build the release bundle (this is a release build; never pass `--debug`):

```powershell
cargo tauri build
```

If `cargo tauri` is not installed, `npm run tauri build` does the same thing.

Artefacts land in `src-tauri/target/release/bundle`:

- `src-tauri/target/release/bundle/msi/*.msi` — the MSI installer (WiX).
- `src-tauri/target/release/bundle/nsis/*-setup.exe` — the NSIS installer.
- `src-tauri/target/release/apicoord.exe` — the release binary used for perf measurement.

- [ ] Clone, `npm ci`, gate and `cargo tauri build` all finish without error from the clean folder.
- [ ] Both the MSI and the NSIS installer exist and install and launch on a machine without the toolchain.
- [ ] The app launches to an empty split window: editor left, preview right, status bar at the bottom.

## 3. Manual QA checklist

Fixtures live in `tests/fixtures/`. Run everything against the installed or release build, not `tauri dev`, unless a line says otherwise.

### 3.1 File I/O (m1-file-io)

- [ ] Open `eol-lf.yaml`; status bar shows UTF-8 and LF. Save with no edits; the file is byte-identical (compare hashes with `Get-FileHash`).
- [ ] Open `eol-crlf.yaml`; status bar shows CRLF. Save without edits is byte-identical. Edit one character, Save; file still CRLF.
- [ ] Open `eol-mixed.yaml` (majority CRLF). Unedited Save is byte-identical. After an edit and Save, the status bar shows the note "Mixed line endings" and the file is written with the majority EOL (CRLF).
- [ ] Open `utf8-bom.yaml`; status bar shows UTF-8 with BOM. Edit and Save; the BOM is still present.
- [ ] Open `utf16le.yaml`; status bar shows UTF-16LE. Edit and Save; it stays UTF-16LE with a BOM.
- [ ] Open `no-final-newline.yaml`; edit and Save; there is still no final newline.
- [ ] Open `legacy-latin1.yaml`; it is refused with "This file isn't UTF-8 or UTF-16 and can't be opened safely." and the previously open document is untouched.
- [ ] Save As on an unedited buffer writes the original bytes to the new path; the title and Recent update to the new name.
- [ ] Make the file read-only (or hold it open in another program) and Save; an error is shown (file locked / read-only) and the buffer stays dirty.
- [ ] Opening `big-10k.yaml` returns promptly; the UI stays responsive.

### 3.2 Editor and status bar (m1-editor)

- [ ] `.yaml`/`.yml` open as YAML and `.json` as JSON. An extensionless (no extension) copy starting with `{` opens as JSON; one starting with `openapi:` opens as YAML.
- [ ] Language dropdown override YAML→JSON changes the mode, does one re-parse, and keeps the model and undo history (undo still works). The override survives Save As and resets when another file is opened.
- [ ] Status bar order: language, encoding (+BOM), EOL, preview status, problem count, cursor as `Ln N, Col N`.
- [ ] Dirty marker: the • prefix appears in the title on first edit and clears on Save, or when undo returns to the saved text.
- [ ] Theme follows the system light/dark setting.
- [ ] With `big-10k.yaml` open, a typed key echoes within 100ms while highlighting finishes.
- [ ] `petstore-3.1.yaml`: editor text visible in under 200ms from file chosen (record the time).
- [ ] Work with the network disabled (offline / no network): Monaco loads, with no jsDelivr request and highlighting works in the release build.

### 3.3 Live preview and last-good (m1-preview)

- [ ] Edit a summary in `petstore-3.1.yaml`; the preview updates about 200ms after the last keystroke.
- [ ] Type a syntax error after a good render: the last render stays and the badge reads "Preview is out of date — line N: ..."; a squiggle shows in Monaco. Fixing it clears the badge and updates the preview.
- [ ] `invalid-on-open.yaml`: the pane shows "Fix the syntax error to see a preview" with the line and message.
- [ ] `non-object.yaml` is treated as a parse error and nothing crashes.
- [ ] A comment-only edit does not re-render the preview.
- [ ] `schema-invalid.yaml` renders a preview and shows problems as squiggles only.
- [ ] No "Try it out" button and no Authorize send ability in the preview; external `$ref`s show swagger's unresolved message.

### 3.4 Validation (m1-validation)

- [ ] `petstore-3.0.yaml` and `petstore-3.1.yaml` show 0 problems; the 3.0 file never gets a line-1 "3.1" error.
- [ ] `schema-invalid.yaml` shows at least one squiggle at the offending line. Record the spike (b) `$dynamicRef` result and any gaps as known limitations.
- [ ] A syntax error shows a squiggle within 300ms; fixing it clears it. Repeat for JSON after an override.
- [ ] Delete or corrupt `%APPDATA%` app data `schemas/oas-3.0.json` and `schemas/oas-3.1.json`; the app still validates and the copies are restored.
- [ ] Validation works in the packaged build, with no HTTP request made.

### 3.5 Menu, shortcuts, dirty guard (m1-menu-lifecycle)

- [ ] File menu: Open, Save, Save As, Recent, Close, Exit; Save/Save As/Close are disabled when no document is open.
- [ ] Ctrl+O, Ctrl+S, Ctrl+Shift+S and Ctrl+W work with Monaco focused. A single Ctrl+S press saves exactly one time (one `save_spec` call). Record the spike (a) outcome.
- [ ] Recent holds exactly 5 entries after 6 distinct opens; opening `C:\a.yaml` then `c:\A.YAML` gives one entry.
- [ ] Recent survives an app restart and entries reopen. A deleted file is removed and the notice says "<name> no longer exists".
- [ ] With a dirty buffer, Close, Open, Recent and window close each show Save / "Don't Save" / Cancel. Cancel changes nothing, "Don't Save" discards, Save writes and then proceeds.
- [ ] With a clean buffer none of them prompt.
- [ ] Title bar shows `name — APICoord`, with the • prefix when dirty.

### 3.6 Shell hardening (m1-foundation)

- [ ] CSP is strict in the release build: no `csp: null`, no http or fs permission in capabilities, and swagger-ui and Monaco still work (spike (c) result recorded).
- [ ] Review `src-tauri/capabilities/*.json`: only `core:default`, `core:window:allow-set-title`, `core:window:allow-destroy`.
- [ ] Cold start to first paint is noted (target under 500ms).

## 4. Perf gate

Measure on the release binary (`src-tauri/target/release/apicoord.exe` or the installed MSI build), never `tauri dev`. The timing harness reads the `apicoord:ks` (every content change) and `apicoord:commit` (swagger commit) performance marks and prints p50 and p95 per fixture.

Gate: keystroke to preview p95 must be under 250ms for Petstore and big-10k, each measured separately.

A miss on either fixture is a failure that holds the increment: report the numbers, do not ship, and send the design back to the architect. There is no fallback tuning.

- [ ] Harness run on the release build with `petstore-3.1.yaml`: p95 < 250ms (record p50/p95).
- [ ] Harness run on the release build with `big-10k.yaml`: p95 < 250ms (record p50/p95).
- [ ] Memory under 200MB idle with Petstore and under 500MB with `big-10k.yaml` (Task Manager).

## 5. Git procedure

Remote: https://github.com/BIoodHound/apicoord, branch `main`. History only moves forward.

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git merge --ff-only <feature-branch>
git push origin main
```

- If `--ff-only` refuses, rebase the feature branch onto `origin/main`, re-run the gate, and try again.
- Never force-push (`--force`, `-f` or a `+` refspec) to `main` or any shared branch.
- Never re-initialise the repository: do not run `git init` in an existing checkout, and do not delete `.git` to start over.
- Do not discard remote history with a hard reset to the remote.
- If a push is rejected, stop and fetch; do not work around it.

- [ ] The final push to `main` was a fast-forward and the remote history was not rewritten.
