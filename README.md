# Buckeye Baton

Buckeye Baton helps OSU students hand off projects, preserve lessons from unfinished or completed work, and get practical help from mentors. Students own project posts and discussions, Staff connects a specific question to a Mentor, and the Mentor responds in the original thread. The app is a hackathon demo with switchable demo identities, not production authentication.

Start with the [project overview](docs/PROJECT_OVERVIEW.md), [current execution roadmap](docs/EXECUTION_ROADMAP.md), and [collaboration guide](docs/HANDOFF.md).

## Current product

The shared `main` branch includes the P0–P5 product:

- Browse, search, and filter projects in Ongoing, Finished, and Paused states. Owners can update their project and preserve its history.
- Pick up a Finished or Paused project by reproducing, continuing, or improving it. The new project links back to its source.
- Ask project-specific questions, discuss them in one thread, and request a Mentor. Staff makes the referral; the assigned Mentor provides formal replies and can answer follow-ups.
- Set a Mentor profile using five fixed expertise areas: front-end, back-end, algorithm, database, and brainstorming. For questions that request a Mentor, AI can score each area for relevance and show Staff up to three candidates with their current Awaiting reply load. Staff always chooses and confirms the referral.
- New projects and pickups require a public GitHub repository URL. The app can read repository metadata and selected project files to draft a short project introduction and constrained Topics/Technologies. The owner edits and confirms the introduction before it appears publicly. Source provenance is shown in the app.
- Every role has an Activity Inbox. Automatic invitations are limited to eligible pickup opportunities; they do not create a project or assign a Mentor.

AI scores indicate relevance, not the probability that a Mentor will solve a question. When AI is unavailable, project content remains saved and Staff can still make a manual referral.

## Run a fresh local copy

Requires Node.js 22 and npm. In PowerShell:

```powershell
git clone https://github.com/BOWEN2491/buckeye-baton.git
cd buckeye-baton
npm ci
Copy-Item .env.example .env.local
npm run db:setup
npm run dev
```

Open http://localhost:3000. To avoid a port already in use, run `npm run dev -- --port 3002` instead.

A fresh clone gets its own ignored `.data/pglite` database and its own `.env.local`; neither is downloaded from GitHub. The first local database connection applies the schema and idempotently seeds fictional starter content: Alex, Mia, Mentor Sarah, Staff Kevin, four example projects, three legacy experience records, and two project questions. It does **not** include the 20-project simulation batch used by the separate 3001 preview. User actions in this clone stay in its database and do not affect another running copy, provided each app uses a different data directory.

The copied `.env.local` uses local PGlite and contains no API key. AI drafting and question analysis need `OPENAI_API_KEY` and `OPENAI_PROJECT_INTRO_MODEL` set locally. To process queued AI work and automatic pickup invitations, set `AI_ANALYSIS_RUNNER_ENABLED=1` and `INVITATION_RUNNER_ENABLED=1`; these background runners require a continuously running Node process and remain off by default. Never commit `.env.local` or share its secrets.

`npm run db:seed` can re-ensure the starter fixture rows. It uses `ON CONFLICT DO NOTHING` and does not reset or overwrite later edits. Run only one app process against a given PGlite data directory.

## Validate

```powershell
npm run typecheck
npm run test:backend
npm run build
npm start
```

Browser tests use an isolated temporary database and local provider mocks:

```powershell
npx playwright install chromium
npm run test:e2e
```

See [P5 verification results](docs/P5_TEST_REPORT.md), [P5 implementation report](docs/P5_REPORT.md), and [manual acceptance route](docs/P5_MANUAL_ACCEPTANCE.md).

## Demo identities

The starter identity switcher includes Alex (`student-alex`), Mia (`student-mia`), Sarah (`mentor-sarah`), and Kevin (`staff-kevin`). The `x-demo-user-id` header is intentionally impersonatable and must not be treated as authentication. Use fictional content only.

## Technical limits and deployment

The app uses Next.js 15, TypeScript, Node.js 22, Tailwind CSS, and PostgreSQL-compatible storage. Local PGlite is persistent but intended for one local Node process; do not share it between services. Real PostgreSQL multi-connection behavior, Neon/AWS setup, public deployment, production authentication, and multi-instance or serverless scheduling have not been verified. Hosted PostgreSQL requires a separately configured `DATABASE_URL` and `npm run db:setup`. Do not deploy local PGlite as a shared cloud database.

## Project handoff documents

- [Product overview](docs/PROJECT_OVERVIEW.md) · [roadmap](docs/EXECUTION_ROADMAP.md) · [API contract](docs/API_CONTRACT.md)
- [P1 contract and acceptance](docs/P1_CONTRACT.md) · [P2 acceptance](docs/P2_ACCEPTANCE.md) · [P3 product revision](docs/P3_PRODUCT_REVISION.md)
- [P4 product revision](docs/P4_PRODUCT_REVISION.md) · [P5 contract](docs/P5_CONTRACT.md) · [P5 manual acceptance](docs/P5_MANUAL_ACCEPTANCE.md)
- Shared types and demo fixtures: `src/shared/`
- Database schema: `db/schema.sql`; local seed: `src/shared/fixtures.ts`