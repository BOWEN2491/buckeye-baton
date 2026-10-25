# Buckeye Baton

OSU project handoffs and team reflections. A hackathon demo connecting students, industry mentors, and OSU Staff.

Start here: [project overview and current scope](docs/PROJECT_OVERVIEW.md), [collaboration and branch rules](docs/HANDOFF.md), and [teammate design references](design/README.md). The user has authorized PR #1 to become the shared main baseline; redundant frontend/backend preparation branches and checkouts have been removed.

Product update (2026-10-24): main includes P0 browsing/reflections and P1 pickup links, questions, Staff referrals and Mentor workbenches. P2 adds owner-reviewed AI browsing introductions/tags and Staff-visible Awaiting reply counts; commit df5f050 passed [independent local acceptance](docs/P2_ACCEPTANCE.md) and is integrated on codex/p2-integration, pending user product acceptance and main merge. Real PostgreSQL multi-connection behavior and hosted deployment remain unverified; P3–P4 are pending. Independent Lesson/adoption UI stays retired; legacy links redirect to their project, adoption writes return HTTP 410, and stored history is preserved.

## Run locally

Requires Node.js 22 and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:setup
npm run dev
```

Open http://localhost:3000. The explicit local `DATABASE_MODE=pglite` stores a PostgreSQL-compatible database in `.data/pglite`; it survives application restarts. Run one app process per data directory. `npm run db:seed` ensures fictional seed content exists without deleting or overwriting user records. Schema setup adds the nullable project reflection column without resetting tables; old Lesson content remains available as historical experience.

To use Neon/hosted PostgreSQL, remove `DATABASE_MODE` from `.env.local` and provide your own `DATABASE_URL`. Use the provider's TLS connection string. Run `npm run db:setup` against that database. Never commit credentials. The application does not create a Neon account or AWS resources.

## Validate

```powershell
npm run typecheck
npm run test:backend
npm run build
npm start
```

Run the phase 1 production browser scenarios after building (the test starts its own server and isolated local database):

```powershell
npx playwright install chromium
npm run test:e2e
```

Optionally set `QA_SCREENSHOT_DIR` to an absolute writable directory to save browser evidence. Test output and screenshots must not contain real personal information. See [verification evidence and limits](docs/QA_VERIFICATION.md).

Demo identities: Alex (`student-alex`), Mia (`student-mia`), Sarah (`mentor-sarah`), Kevin (`staff-kevin`). The visible switcher supplies `x-demo-user-id`; this is deliberately impersonatable demo identity, not production authentication. Use fictional content only.

## Handoff

- [P0–P4 roadmap and progress gates](docs/EXECUTION_ROADMAP.md)
- [P1 shared contract](docs/P1_CONTRACT.md)
- [P1 single-agent full-stack task](docs/P1_AGENT_TASK.md)
- [P1 independent acceptance](docs/P1_ACCEPTANCE.md)
- [P2 single-agent full-stack task](docs/P2_AGENT_TASK.md) / [P2 contract](docs/P2_CONTRACT.md)
- [P2 independent acceptance](docs/P2_ACCEPTANCE.md) / [existing real-AI evidence](docs/evidence/P2_REAL_AI_RESULT.md)

- [MVP and roles](docs/MVP_SPEC.md)
- [API contract](docs/API_CONTRACT.md)
- [Current phase 1 acceptance](docs/PHASE1_ACCEPTANCE.md)
- [Full v2 target journey, pending](docs/ACCEPTANCE.md)
- [Parallel chat handoff](docs/HANDOFF.md)
- Shared TypeScript interfaces and fictional fixtures: `src/shared/`.

Frontend owns components/pages; backend owns `src/server`, API route handlers, database schema, and scripts. Coordinate shared types and dependency changes. Remote repository: `BOWEN2491/buckeye-baton`. Main is the shared baseline; create short-lived branches for concrete tasks and use extra worktrees only for actual parallel work.

## Deployment

The implementation is pinned to Next.js 15 and Node.js 22 for the selected Amplify candidate. AWS eligibility, credits, database access, and public deployment remain external prerequisites. Validate a minimal hosted database read/write before deploying the entire experience. Local PGlite is for a single-process demo and is not shared production storage.

Deferred: real login, uploads, project forks, complex graph, notifications, and AI. Future AI may tag questions and shortlist mentors while Staff makes the final choice.
