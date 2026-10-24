# Buckeye Baton — parallel handoff

> **2026-10-24 第一轮：** 首页与三状态项目详情、总结编辑、校验保存已进入当前实现；验证状态见 PHASE1_ACCEPTANCE.md。接棒、项目求助、Staff 引荐与 Mentor 指导仅占位，下一轮再接真实交互。本轮先不需要接棒/讨论草图。旧 Lesson 接口和数据兼容保留，不扩展采用统计。完整目标仍见 MVP_SPEC.md / ACCEPTANCE.md。

## Baseline
The application is at the repository root on codex/buckeye-baton-mvp. Old Python/Vite/Streamlit rehearsal code was removed on request; see PRIOR_WORK.md and Git history. The baseline adds phase 1 reflections on top of compatible v1 records; full v2 project relay is not yet implemented. Reuse identity, database, permissions and referral infrastructure.

Both workstreams use Next.js pages and routes in one app. Each worktree has its own dependencies/build files and local database; do not point two processes at one PGlite directory. Use different local ports if running both at once.

## Frontend chat prompt
You are continuing Buckeye Baton frontend work. Read AGENTS.md, PROJECT_CONTEXT.md, docs/MVP_SPEC.md, docs/API_CONTRACT.md, docs/ACCEPTANCE.md, and DECISIONS.md. Inspect current Git status. Own src/app pages (excluding api), src/components, src/lib and styles. Keep real API integration and the approved four-identity demo (two students, one Mentor, one Staff). Work with teammate design/content. Coordinate shared types/dependencies before edits. Run typecheck/build and relevant browser tests. Report files, commands, evidence and remaining limits. Do not claim cloud deployment from local tests.

## Backend chat prompt
You are continuing Buckeye Baton backend work. Read the same documents and current Git status. Own src/server, src/app/api, db, scripts and backend tests. Preserve parameterized SQL, ownership checks and atomic Mentor replies. Coordinate v2 project reflections, question ownership, successor relations and preservation of v1 records before changing types/schema. Legacy adoption counts are not v2 requirements. Production uses pg/PostgreSQL; explicit PGlite is a persistent local demo. Run backend tests/typecheck/build and updated UI acceptance. Report evidence and unconfigured services.

## Integration review
First verify current phase 1 via PHASE1_ACCEPTANCE.md: project browse/create/edit, state-specific validation, history preservation, inline placeholders, identity reset and 390px layout. Full relay below remains next-round target.

Bring both branches back before merging main. Verify Alex's Paused project → Mia's linked Ongoing project → project question → Kevin's referral → Sarah's reply → Mia's progress → Alex's successor-project view. Follow the new acceptance, including denied actions, preserved history, persistence and mobile layout. Passing v1 tests do not verify v2.

## Commands
From each worktree root: npm ci; copy .env.example to .env.local; npm run db:setup; npm run dev -- --port 3001 (or 3002). For acceptance: npm run typecheck; npm run test:backend; npm run build; npm run test:e2e. Install Chromium once with npx playwright install chromium.

AWS credits, real Neon/PostgreSQL credentials and public hosting remain separate setup tasks. No paid cloud resource was created. AI Mentor shortlist remains future work with final Staff choice.

## Prepared checkouts

- Integration: `C:/Users/23678/.codex/workspaces/buckeye-baton`, branch `codex/buckeye-baton-mvp`.
- Frontend: `C:/Users/23678/.codex/workspaces/buckeye-baton-frontend`, branch `codex/buckeye-baton-frontend`.
- Backend: `C:/Users/23678/.codex/workspaces/buckeye-baton-backend`, branch `codex/buckeye-baton-backend`.

Open each corresponding folder in the new coding chat. Run npm ci and local environment setup per README on first use. Working directories have independent build/database files. Review PR: https://github.com/BOWEN2491/buckeye-baton/pull/1 . No merge to main was performed.
