# Buckeye Baton â€” current project context

Updated 2026-10-24, America/New_York. Repository: https://github.com/BOWEN2491/buckeye-baton

## Product
Approved MVP v2: OSU teams publish projects with embedded reflections. Later teams reproduce, continue or improve a project by creating their own linked Ongoing project. Staff connect project questions with industry Mentors. See docs/MVP_SPEC.md for the five confirmed decisions; independent Lesson adoption is superseded as the target journey.

## Implementation
The Next.js app is at repository root. Use Node 22 and npm. V2 phase 1 adds project-only exploration, three-state reflection details, owner editing and validated state changes. ProjectReflection is nullable JSONB; old projects retain null and display existing lessons inline as historical experience. Legacy Lesson APIs/records remain compatible. Pickup, project questions, Staff referral and Mentor guidance are placeholders with no writes; full project relay remains pending. See docs/PHASE1_ACCEPTANCE.md for current scope and verification status.

Explicit PGlite mode persists locally; hosted pg requires DATABASE_URL. Four demo identities are not authentication. Incremental setup and additive seeds preserve existing records and edits.

## Verification boundary
Phase 1 typecheck, production build, backend integration 2/2 and production browser tests 4/4 passed (10.8 seconds). Browser coverage includes owned state edits and retained history, filters/legacy history/mobile state details, identity reset and non-mutating placeholders. Live local migration preserved all four existing projects unchanged and added only two new fixture rows. Earlier Lesson-v1 evidence remains historical; neither it nor phase 1 proves the complete v2 relay. Neon connectivity, AWS credits, public hosting and teammate readiness remain unverified.

## History and cleanup
Previously named Pass It On during planning. The user renamed the project Buckeye Baton and authorized removal of obsolete preparation examples. React/Vite echo UI, FastAPI echo, Streamlit fallback, Python API checks and their dependencies are removed from this branch. Historical files remain recoverable through Git; PRIOR_WORK.md records provenance.

## Next
Teammate reviews phase 1 wording and card interactions, then supplies pickup-form and project question/referral/reply sketches; coordinate project relationship/question contracts and legacy discussion mapping before implementing full relay. AI remains deferred; Neon/AWS need separate setup and verification.

## Review handoff
First usability feedback: identity changes return to unfiltered Explore projects and reset unsaved page state. Project/lesson explanations and the save-then-try-then-report instructions are explicit. Reopen a lesson after switching identities, or follow Staff/Mentor workspace links.

Draft PR: https://github.com/BOWEN2491/buckeye-baton/pull/1 . Integration branch codex/buckeye-baton-mvp. Frontend/backend branches and paths are in docs/HANDOFF.md. Main has not been merged.
