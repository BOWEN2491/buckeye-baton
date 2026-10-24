# Buckeye Baton

Student project lessons that help the next team. A hackathon demo connecting students, industry mentors, and OSU Staff.

Product update (2026-10-24): [MVP v2 specification](docs/MVP_SPEC.md) defines project-centered handoffs and successor projects. The running application still implements the earlier Lesson workflow. V2 is specified, not implemented; the [API contract](docs/API_CONTRACT.md) distinguishes current interfaces from pending changes.

## Run locally

Requires Node.js 22 and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:setup
npm run dev
```

Open http://localhost:3000. The explicit local `DATABASE_MODE=pglite` stores a PostgreSQL-compatible database in `.data/pglite`; it survives application restarts. Run one app process per data directory. `npm run db:seed` ensures fictional seed content exists without deleting user records.

To use Neon/hosted PostgreSQL, remove `DATABASE_MODE` from `.env.local` and provide your own `DATABASE_URL`. Use the provider's TLS connection string. Run `npm run db:setup` against that database. Never commit credentials. The application does not create a Neon account or AWS resources.

## Validate

```powershell
npm run typecheck
npm run test:backend
npm run build
npm start
```

Run the production browser journey after building (the test starts its own server and isolated local database):

```powershell
npx playwright install chromium
npm run test:e2e
```

Optionally set `QA_SCREENSHOT_DIR` to an absolute writable directory to save browser evidence. Test output and screenshots must not contain real personal information. See [verification evidence and limits](docs/QA_VERIFICATION.md).

Demo identities: Alex (`student-alex`), Mia (`student-mia`), Sarah (`mentor-sarah`), Kevin (`staff-kevin`). The visible switcher supplies `x-demo-user-id`; this is deliberately impersonatable demo identity, not production authentication. Use fictional content only.

## Handoff

- [MVP and roles](docs/MVP_SPEC.md)
- [API contract](docs/API_CONTRACT.md)
- [Acceptance journey](docs/ACCEPTANCE.md)
- [Parallel chat handoff](docs/HANDOFF.md)
- Shared TypeScript interfaces and fictional fixtures: `src/shared/`.

Frontend owns components/pages; backend owns `src/server`, API route handlers, database schema, and scripts. Coordinate shared types and dependency changes. Remote repository: `BOWEN2491/buckeye-baton`. Use separate working directories and branches once a baseline commit is reviewed.

## Deployment

The implementation is pinned to Next.js 15 and Node.js 22 for the selected Amplify candidate. AWS eligibility, credits, database access, and public deployment remain external prerequisites. Validate a minimal hosted database read/write before deploying the entire experience. Local PGlite is for a single-process demo and is not shared production storage.

Deferred: real login, uploads, project forks, complex graph, notifications, and AI. Future AI may tag questions and shortlist mentors while Staff makes the final choice.
