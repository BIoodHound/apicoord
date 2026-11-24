# M1 — Native menu, Recent files, dirty-state guard

**Research:** `native-file-menu-recent-files.md`, `tauri-capabilities.md`, `tauri-ipc-patterns.md`. **Decision:** council m1 #6, #7, #8, rules 10, 11, 14.

## Goal
File menu with Open, Save, Save As, Recent (last 5) and Close, using native dialogs, and no way to lose unsaved edits by accident.

## User-visible behaviour
- Native **File** menu: Open… (Ctrl+O), Save (Ctrl+S), Save As… (Ctrl+Shift+S), Recent ▸ (up to 5, most recent first), Close (Ctrl+W), Exit.
- Save/Save As/Close are disabled when no document is open.
- Picking a Recent entry opens it. If the file is missing, it is removed from the list and a notice says "<name> no longer exists".
- If the buffer is dirty, Close, Open, Recent and closing the window all show Save / Don't Save / Cancel. Save then proceeds (and aborts the action if the save fails or is cancelled); Cancel aborts.
- The title bar shows `name — APICoord`, with `•` prefix when dirty.
- Ctrl+S has **one owner**: if spike (a) in `m1-foundation` shows the menu accelerator fires in Monaco, the menu owns it and Monaco binds nothing; otherwise Monaco's `addCommand` owns it and the menu shows "Ctrl+S" as a label only. Same rule for Ctrl+O/W/Shift+S.

## API shape
- `list_recent() -> RecentEntry[]`; event `recent://changed`; event `menu://action {id}`.
- All opening/saving goes through `m1-file-io` commands. Window close uses `onCloseRequested` → `confirmDiscardIfDirty()`.

## Data
`app_data_dir/recent.json`: array of ≤5 `{path, lastOpened}`; normalised paths (case-fold, strip `\\?\`, UNC) before de-dup; move-to-front; write atomically; corrupt file → empty list.

## Acceptance criteria
- Open, Save, Save As, Recent, Close each work from the menu; Save As updates path and Recent.
- Recent holds exactly 5 after 6 distinct opens; opening `C:\a.yaml` then `c:\A.YAML` yields one entry.
- Recent survives an app restart and entries reopen successfully (via Rust command, not fs scope).
- Missing Recent file is removed and a notice shown.
- A single Ctrl+S press causes exactly one `save_spec` call (QA test).
- With a dirty buffer, each of Close / Open / Recent / window-close shows the three-way prompt; Cancel leaves the buffer and file unchanged; Don't Save discards; Save writes then proceeds.
- With a clean buffer none of them prompt.

## Non-goals
Pinned files; Clear Recent; autosave; multi-window; drag-and-drop open. **Cut order:** if scope slips, the native Recent submenu may fall back to an in-webview Recent list for M1 (council #8) — the behaviours above still apply.

## Open questions for the operator
None new (see `m1-file-io`, `m1-foundation`).
