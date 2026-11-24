# Knowledge: architect (the game 'apicoord')

<!-- Curated by the auditor, applied by the orchestrator. Format: [id] (confidence) lesson {evidence}. Edit by hand if you disagree; raise confidence to make a lesson a rule. -->

- [K006] (0.50) No network code: bundle schemas and editor assets, seed app_data_dir from resources, and give the webview no HTTP permission {apicoord:i1-design-gate1}
- [K007] (0.50) Perf budgets are hard gates (a miss holds the increment), so design the hot path to fit the budget and put the timing harness in task zero; don't rely on degrading fallbacks {apicoord:i1-design-gate1}
- [K008] (0.50) No network code: bundle schemas and editor assets, seed app_data_dir from resources, and give the webview no HTTP permission {apicoord:M1-spec-gate}
- [K009] (0.50) Perf budgets are hard gates (a miss holds the increment), so design the hot path to fit the budget and put the timing harness in task zero; don't rely on degrading fallbacks {apicoord:M1-spec-gate}
