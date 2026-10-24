# Findings

- Original Documents checkout is empty and rejects new file writes. `.codex/workspaces/pass-it-on` is writable and is the canonical checkout; no remote was provided.
- Bundled Node is 24.22.1. Node 22.23.4 was installed in `.codex/runtimes/pass-it-on-node22` for matching validation.
- npm registry latest Next 15 patch is 15.5.28; React and React DOM latest matching 19 release is 19.3.1.
- No hosted database credential was supplied. Explicit local PGlite enables persistent testing without fabricating cloud success.
