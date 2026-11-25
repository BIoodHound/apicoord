# Knowledge: qa-engineer (the game 'apicoord')

<!-- Curated by the auditor, applied by the orchestrator. Format: [id] (confidence) lesson {evidence}. Edit by hand if you disagree; raise confidence to make a lesson a rule. -->

- [K008] (0.50) Perf is verified by a manual run on the target Windows laptop (release build), recorded in the increment report; a p95 miss on any fixture is a blocking failure, not a note {apicoord:i1-design-gate1}
- [K009] (0.50) Save tests assume no prompts: unedited Save/Save As is byte-identical; edited mixed-EOL saves majority EOL with a status-bar note; the language override survives Save As and resets on opening another file {apicoord:i1-design-gate1}
