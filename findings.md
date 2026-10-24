# Findings

- Original Documents checkout is empty and rejects new file writes. `.codex/workspaces/pass-it-on` is writable and is the canonical checkout; no remote was provided.
- Bundled Node is 24.22.1. Node 22.23.4 was installed in `.codex/runtimes/pass-it-on-node22` for matching validation.
- npm registry latest Next 15 patch is 15.5.28; React and React DOM latest matching 19 release is 19.3.1.
- No hosted database credential was supplied. Explicit local PGlite enables persistent testing without fabricating cloud success.

## Durable regression finding
A shared useResource hook can receive different response shapes across tabs. Request generation guards alone prevent late responses but do not prevent the first render after path change from reading the previous shape before useEffect clears state. Key the stored state by request path and identity, and synchronously hide mismatched-key data. Browser tests that switch Lessons back to Projects catch this failure.

Use explicit stable aria-labels for result form controls; implicit label text can include a textarea's default text in locator matching. Scope assertions to the rendered adoption record when the same text also exists in an editing textarea.
