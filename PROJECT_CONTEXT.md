# Buckeye Baton â€” current project context

Updated 2026-10-24, America/New_York. Repository: https://github.com/BOWEN2491/buckeye-baton

## Product
OSU students publish structured lessons from projects. Later teams find, discuss, apply and report outcomes. Staff introduce industry mentors into concrete questions. Student / Mentor / Staff share the same content.

## Implementation
The Next.js app is at repository root. Use Node 22 and npm. Server APIs, shared types, fictional seed data and PostgreSQL schema are implemented. Without hosted credentials explicit PGlite mode persists locally. Read README and docs/ for startup and contracts. Four demo identities are not authentication.

## Verification boundary
Earlier local Node 22 build, backend permissions/persistence/concurrency tests and manual browser journey passed. Automated browser tests found a resource-type switch race; the hook now keys data by request and hides mismatched responses synchronously. Branding/root cleanup passed a fresh production build and two automated browser acceptance tests, including the tab-switch regression and 390px layout. Neon connectivity, AWS credits, public hosting and teammate readiness remain unverified.

## History and cleanup
Previously named Pass It On during planning. The user renamed the project Buckeye Baton and authorized removal of obsolete preparation examples. React/Vite echo UI, FastAPI echo, Streamlit fallback, Python API checks and their dependencies are removed from this branch. Historical files remain recoverable through Git; PRIOR_WORK.md records provenance.

## Next
Finish automated acceptance, publish a reviewable independent branch, and connect Neon/AWS only when account settings are available. Future AI tags questions and proposes mentor candidates; Staff chooses.

## Review handoff
Draft PR: https://github.com/BOWEN2491/buckeye-baton/pull/1 . Integration branch codex/buckeye-baton-mvp. Frontend/backend branches and paths are in docs/HANDOFF.md. Main has not been merged.
