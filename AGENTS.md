# Buckeye Baton — agent entry

Read PROJECT_CONTEXT.md, docs/MVP_SPEC.md, docs/API_CONTRACT.md, docs/ACCEPTANCE.md, DECISIONS.md, and project-docs/index.html before changes.

This is the Honda HackOHI/O 2026 competition app: Next.js 15 / TypeScript / Node 22 / Tailwind / PostgreSQL. Source is now at repository root. Historical React/Vite, FastAPI, Streamlit and optional AI rehearsal code was removed at the user’s request; recover it from Git history if needed.

- Frontend owns src/app pages, src/components, and src/lib. Backend owns src/server, src/app/api, db, scripts. Coordinate src/shared, dependencies and migrations.
- Use separate codex/ branches and worktrees. Do not force-push or overwrite teammate changes.
- Run npm run typecheck, npm run test:backend, npm run build; npm run test:e2e uses an isolated local SQL database after build.
- Do not commit .env.local, credentials, local databases, node_modules or build artifacts.
- Demo identity is deliberately switchable, not production authentication. Use fictional content. Hosted pg requires DATABASE_URL; explicit PGlite mode is a single-process local demo.
- Update documentation and decision records after meaningful changes. Never claim Neon/AWS/public deployment passed based only on local checks.
- AI project summaries and AI mentor shortlists remain deferred; Staff makes the final referral decision.
