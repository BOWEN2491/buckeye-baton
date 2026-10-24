# Buckeye Baton — parallel handoff

## Baseline
The application is at the repository root on codex/buckeye-baton-mvp. Old Python/Vite/Streamlit rehearsal code was removed on request; see PRIOR_WORK.md and Git history. The current baseline already implements the core journey. Do not rebuild an unrelated scaffold.

Both workstreams use Next.js pages and routes in one app. Each worktree has its own dependencies/build files and local database; do not point two processes at one PGlite directory. Use different local ports if running both at once.

## Frontend chat prompt
You are continuing Buckeye Baton frontend work. Read AGENTS.md, PROJECT_CONTEXT.md, docs/MVP_SPEC.md, docs/API_CONTRACT.md, docs/ACCEPTANCE.md, and DECISIONS.md. Inspect current Git status. Own src/app pages (excluding api), src/components, src/lib and styles. Keep real API integration and the approved four-identity demo (two students, one Mentor, one Staff). Work with teammate design/content. Coordinate shared types/dependencies before edits. Run typecheck/build and relevant browser tests. Report files, commands, evidence and remaining limits. Do not claim cloud deployment from local tests.

## Backend chat prompt
You are continuing Buckeye Baton backend work. Read the same shared documents and current Git status. Own src/server, src/app/api, db, scripts and backend tests. Preserve parameterized SQL, server-side ownership checks, atomic Mentor replies, unique adoption pairs and saved-versus-reported counting. Production uses pg/PostgreSQL; explicit PGlite is a persistent local demo. Coordinate public types and schema changes. Run backend tests/typecheck/build and relevant UI acceptance after changes. Report evidence and unconfigured services.

## Integration review
Bring both branches back to the coordinating chat before merging main. Verify the full Alex → Mia → Staff Kevin → Mentor Sarah → Mia outcome → Alex contribution story, source/destination links, denied actions, persistence and mobile layout. Reviewer must inspect code and run the app rather than relying on completion messages.

## Commands
From each worktree root: npm ci; copy .env.example to .env.local; npm run db:setup; npm run dev -- --port 3001 (or 3002). For acceptance: npm run typecheck; npm run test:backend; npm run build; npm run test:e2e. Install Chromium once with npx playwright install chromium.

AWS credits, real Neon/PostgreSQL credentials and public hosting remain separate setup tasks. No paid cloud resource was created. AI Mentor shortlist remains future work with final Staff choice.
