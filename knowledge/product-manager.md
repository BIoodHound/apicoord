# Knowledge: product-manager (the game 'apicoord')

<!-- Curated by the auditor, applied by the orchestrator. Format: [id] (confidence) lesson {evidence}. Edit by hand if you disagree; raise confidence to make a lesson a rule. -->

- [K002] (0.50) Brief performance numbers are hard acceptance gates: a miss holds the increment. Never plan a degradation (e.g., a longer debounce) as the fallback leaning {apicoord:i1-design-gate1}
- [K003] (0.50) File saving never prompts: an unedited buffer (Save or Save As) writes the original bytes; an edited mixed-EOL file saves with the majority EOL plus a status-bar note; the status bar always shows encoding and EOL {apicoord:i1-design-gate1}
- [K004] (0.50) View overrides such as language are session-only: they follow the document through Save As and reset when another file opens {apicoord:i1-design-gate1}
- [K005] (0.50) Prefer bundled assets copied to app_data_dir over remote fetch-and-cache; the app ships no network code unless the operator asks for it {apicoord:i1-design-gate1}
- [K006] (0.50) Brief performance numbers are hard acceptance gates: a miss holds the increment. Never plan a degradation (e.g., a longer debounce) as the fallback leaning {apicoord:M1-spec-gate}
- [K007] (0.50) File saving never prompts: an unedited buffer (Save or Save As) writes the original bytes; an edited mixed-EOL file saves with the majority EOL plus a status-bar note; the status bar always shows encoding and EOL {apicoord:M1-spec-gate}
- [K008] (0.50) View overrides such as language are session-only: they follow the document through Save As and reset when another file opens {apicoord:M1-spec-gate}
- [K009] (0.50) Prefer bundled assets copied to app_data_dir over remote fetch-and-cache; the app ships no network code unless the operator asks for it {apicoord:M1-spec-gate}
