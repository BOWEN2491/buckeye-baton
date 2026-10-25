# Buckeye Baton — agent entry

Read PROJECT_CONTEXT.md, docs/MVP_SPEC.md, docs/API_CONTRACT.md, docs/ACCEPTANCE.md, DECISIONS.md, and project-docs/index.html before changes.

Start with docs/PROJECT_OVERVIEW.md for the consolidated scope. Main is the shared baseline after the user-authorized PR #1 merge. Use short-lived task branches; old permanent frontend/backend preparation branches were removed. Design references are in design/; unresolved prototype additions are not automatically approved requirements. Historical planning notes live in docs/legacy/planning/.

This is the Honda HackOHI/O 2026 competition app: Next.js 15 / TypeScript / Node 22 / Tailwind / PostgreSQL. Source is now at repository root. Historical React/Vite, FastAPI, Streamlit and optional AI rehearsal code was removed at the user’s request; recover it from Git history if needed.

- P1 is accepted and merged. P2 uses one full-stack Agent: follow docs/P2_AGENT_TASK.md and docs/P2_CONTRACT.md; the former Worker A/B split is superseded. Contract and dependency changes remain coordinated with the controller. Report once at final delivery, except necessary credential decisions or genuine blockers.
- Use separate codex/ branches and worktrees. Do not force-push or overwrite teammate changes.
- Run npm run typecheck, npm run test:backend, npm run build; npm run test:e2e uses an isolated local SQL database after build.
- Do not commit .env.local, credentials, local databases, node_modules or build artifacts.
- Demo identity is deliberately switchable, not production authentication. Use fictional content. Hosted pg requires DATABASE_URL; explicit PGlite mode is a single-process local demo.
- Update documentation and decision records after meaningful changes. Never claim Neon/AWS/public deployment passed based only on local checks.
- P2 including comment deletion passed user product acceptance. Independent base acceptance is on df5f050 (docs/P2_ACCEPTANCE.md), with deletion regression on d97920f; integrated on codex/p2-integration. PR #3 is open; main merge has not been explicitly authorized. Read docs/COORDINATOR_HANDOFF.md for exact branches, live previews, configuration and data paths before operations. Preserve authored summary/tags/reflections. AI mentor shortlists remain deferred; Staff makes the final referral decision. Never expose secrets or initiate model calls for P3 rule planning.

- Product acceptance addition: project owners may delete any project discussion post; post authors may delete their own. Questions/referrals remain. Soft-deleted posts are excluded by the common thread/queue query; see docs/COMMENT_DELETION.md. This supersedes the old exclusion of post deletion.

- P3 uses one full-stack Agent: docs/P3_AGENT_TASK.md and docs/P3_CONTRACT.md. Candidate 2977e4d passed all four existing checks but independent acceptance is 8/10; R1 precision loss in cross-question priority ordering blocks J4/J5 (docs/P3_REVIEW.md). Candidate source is not integrated; origin/codex/p3-integration retains accepted P2 plus planning/review docs, while origin/main alone has no P2. No real model calls, invitations, dependencies or schema additions. Preserve live 3000/3001 previews; never build in the coordinator checkout while its P1 .next is running.
