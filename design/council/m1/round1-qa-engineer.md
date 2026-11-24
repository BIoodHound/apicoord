# Round 1: qa-engineer

# QA position: testability and edge cases for Increment 1

**What the tests show today:** there are only two tests. `App.test.tsx` checks that a heading renders, and `health.rs` checks that `ping` returns `"ok"`. So nothing about how the app behaves is pinned down yet, and every rule below needs a test written from scratch. Two smaller points: `ping` is synchronous, which breaks the "every command async" rule in ipc-contract.md, and the test locations in architecture.md (`src-tauri/tests/tasks/`, `src/__tests__/tasks/`) are the ones I'll use.

## 1. Key design questions and my recommendations

**Q1. Which schema validates a 3.0 file?** The brief says to validate against the 3.1 schema, but 3.0 files are in scope. The 3.1 schema only accepts an `openapi` value starting with 3.1 (pattern `^3\.1\.\d+`). That means every 3.0 file would get a red squiggle on line 1, plus false errors such as `nullable`.
- **Recommendation:** read the `openapi:` field and pick the schema from it. Ship both the 3.0 and 3.1 schemas with the app, and use the fetch-and-cache step only to refresh the 3.1 copy. This is what cached-remote-schema-offline.md suggests (§4).
- **Gate test:** open a valid 3.0 Petstore and get zero errors.

**Q2. Syntax errors and schema errors behave differently.** There are two separate pipelines: our 200 ms parse feeds Swagger, and the monaco-yaml worker drives the squiggles. The rules need to say:
- **YAML that fails to parse:** keep the last good Swagger view, show one toast that updates in place (not a new toast every 200 ms), and show a squiggle.
- **Valid YAML that breaks the schema:** Swagger still updates, and only the squiggles flag the problem.
- **Valid YAML that isn't an object** (an empty document, a bare number or string, a list): treat it as a parse failure for Swagger. Swagger crashes on non-objects (swagger-ui-react-embed.md, "Risks").
- **A file that is invalid when first opened:** there is no last good view yet, so we need a defined empty state, not a blank pane.

**Q3. Out-of-order parse results.** If parsing moves to a worker (the research suggests it), a slow parse can finish after a newer one and overwrite it.
- **Rule:** tag each parse with an increasing number and throw away any result older than the latest one already shown.
- **Test:** use Vitest fake timers with a deliberately delayed parse.

**Q4. What exactly must "byte-identical" round-trip?**
- **Rule:** saving with no edits must write back exactly the bytes we read.
- **Fixtures:** LF, CRLF, UTF-8 with a BOM, UTF-16LE, no final newline, and mixed line endings.
- **Mixed line endings conflict with this rule,** because Monaco normalises them (text-file-roundtrip.md). Proposal: saving a file with no edits writes the original bytes (or nothing). Once the file is edited, use the majority line ending and say so in the status bar.
- **Non-UTF encodings:** refuse to open other legacy encodings, with a clear error. Don't guess and decode them lossily.
- **Writes are atomic:** write a temp file, then rename it over the original.

**Q5. Dirty-state rules.** The brief doesn't say what happens to unsaved changes on Close, on Open over an open file, on picking a Recent file, or when the window closes.
- **Rule:** ask Save / Don't Save / Cancel in all four cases.
- **Save As** moves the file to the new path and updates the Recent list.
- **Recent list:** the brief says 5 and the research says about 10. The brief wins, so 5.
- **Recent list duplicates:** before comparing, normalise Windows paths (ignore case, handle `\\?\` and UNC forms).
- **Missing recent file:** remove the entry and show a toast.
- **Reopening a recent file after a restart** must go through a Rust read command. The file-system permission granted by the dialog doesn't survive a restart (native-file-menu-recent-files.md, "Risks").

**Q6. Language detection.**
- `.yaml`/`.yml` open as YAML and `.json` as JSON.
- **Any other extension:** look at the content. If the first non-blank character is `{`, treat it as JSON, otherwise YAML.
- **Status-bar override:** applies to this session only, and only to how the text is read. It must not change the bytes on save.
- **Test:** open a YAML file, override to JSON, and check that the parse fails while the last good view stays and the save output doesn't change.

**Q7. Schema cache failures.** Cover these with tests: a corrupt cache file, a half-written cache file, being offline, and fetching turned off. Each one must fall back to the bundled schema. A cache hit must make no network call. That means the Rust fetcher needs to be swappable so tests can inject a fake.

**Q8. How do we measure the speed targets?** "Open Petstore in <200 ms" needs a start and end point. Proposal: from the moment the dialog returns the path to Swagger's first render, recorded with `performance.mark` calls in the code.
- **Measured on:** the target Windows laptop and written into the increment report. It shouldn't be a CI gate, because the test machine here is a Pi.
- **Typing-to-preview p95:** collect samples from the same marks.

## 2. My biggest concern

Every acceptance check in the brief happens at a boundary my tests can't reach. Squiggles come from Monaco's web workers, saving goes through Tauri IPC to disk, menus are native, and "responsive on a 10k-line file" is a real-browser question. jsdom can't run Monaco or its workers, and Playwright tests are deferred to v1.1. If monaco-yaml's worker isn't wired up, validation simply never runs and nothing reports an error (monaco-in-tauri.md and the cache brief both warn about this). We could ship with every gate test green and no validation at all.

I'm asking the board for three things:
- **Pure, testable pieces:** build the logic as pure code I can test directly: language detection, the parse/last-good-view state, the encoding and line-ending handling in Rust, the Recent list, and choosing the schema and its fallback.
- **A spike in this increment:** an early test that confirms the 3.1 schema's newer reference features (`$dynamicRef`) actually produce squiggles in monaco-yaml.
- **A written manual checklist:** fixed fixture files that a person runs on Windows before I sign off. The checklist covers squiggles appearing within 300 ms and clearing, the round-trip fixtures, and the 10k-line file.

Without these, my verdict can only cover the logic, not what the user actually experiences.
