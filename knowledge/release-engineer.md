# Knowledge: release-engineer (the game 'apicoord')

<!-- Curated by the auditor, applied by the orchestrator. Format: [id] (confidence) lesson {evidence}. Edit by hand if you disagree; raise confidence to make a lesson a rule. -->

- [K001] (0.30) In apicoord the raw Tauri release exe is named after the Cargo package (`app`) until mainBinaryName or the crate name changes; point perf runs at the installed MSI build or the verified exe path {apicoord:M1-T014}
