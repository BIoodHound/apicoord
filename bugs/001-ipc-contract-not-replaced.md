# ipc-contract.md was not replaced with architecture.md §5

- **What:** `design/ipc-contract.md` is still the 29-line placeholder (only `ping`, no events). It should contain architecture.md §5 verbatim: 9 commands, 2 events, and the allow-list rule that only `open_recent` takes a path.
- **Steps:** Read `design/ipc-contract.md`. Compare it with the `## 5.` to `## 6.` section of `design/architecture.md` (lines 122-211).
- **Where:** `design/ipc-contract.md`. The implementer's write was blocked by the ownership hook (B2).
- **Severity:** blocker (criteria 1-3 fail).
