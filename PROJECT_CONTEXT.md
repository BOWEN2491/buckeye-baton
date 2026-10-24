# Buckeye Baton â€” current project context

Updated 2026-10-24, America/New_York. Repository: https://github.com/BOWEN2491/buckeye-baton

## Product
Approved MVP v2: OSU teams publish projects with embedded reflections. Later teams reproduce, continue or improve a project by creating their own linked Ongoing project. Staff connect project questions with industry Mentors. See docs/MVP_SPEC.md for the five confirmed decisions; independent Lesson adoption is superseded as the target journey.

## Implementation
The Next.js app is at repository root. Use Node 22 and npm. Current code, shared types, database and APIs still implement Lesson v1. V2 is specified, not implemented. API_CONTRACT.md marks this boundary; previous specifications and acceptance are in docs/legacy/. Explicit PGlite mode persists locally. Four demo identities are not authentication.

## Verification boundary
Earlier local Node 22 build, backend permissions/persistence/concurrency tests and manual browser journey passed. Automated browser tests found a resource-type switch race; the hook now keys data by request and hides mismatched responses synchronously. Branding/root cleanup passed a fresh production build and two automated browser acceptance tests, including the tab-switch regression and 390px layout. Neon connectivity, AWS credits, public hosting and teammate readiness remain unverified.

## History and cleanup
Previously named Pass It On during planning. The user renamed the project Buckeye Baton and authorized removal of obsolete preparation examples. React/Vite echo UI, FastAPI echo, Streamlit fallback, Python API checks and their dependencies are removed from this branch. Historical files remain recoverable through Git; PRIOR_WORK.md records provenance.

## Next
Teammate supplies pickup-form and project question/referral/reply sketches. Coordinate v2 types, APIs and non-destructive legacy-record mapping before parallel implementation. Implement project relationships and run target acceptance. AI remains deferred; Neon/AWS need separate setup and verification.

## Review handoff
First usability feedback: identity changes return to unfiltered Explore projects and reset unsaved page state. Project/lesson explanations and the save-then-try-then-report instructions are explicit. Reopen a lesson after switching identities, or follow Staff/Mentor workspace links.

Draft PR: https://github.com/BOWEN2491/buckeye-baton/pull/1 . Integration branch codex/buckeye-baton-mvp. Frontend/backend branches and paths are in docs/HANDOFF.md. Main has not been merged.
