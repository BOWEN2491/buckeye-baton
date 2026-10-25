Current P4 product override: docs/P4_PRODUCT_REVISION.md supersedes conflicting original P4 rules. Invitations are pickup-only; notifications for removed posts are hidden from recipients except the remover.

# Buckeye Baton — agent entry

Read project-docs/index.html, PROJECT_CONTEXT.md, DECISIONS.md and docs/PROJECT_OVERVIEW.md before changes. P4 is now integrated in codex/p4-integration and independently accepted locally10/10 on372646c; next is user product acceptance in a separate preview. See docs/P4_ACCEPTANCE.md. P4_AGENT_TASK/P4_CONTRACT remain delivery references. Do not start from old main, which lacks P2/P3/P4.

P4 application372646c passed typecheck/build, backend20/20, production e2e23/23 and the original refresh/Load-more race probe. R1/R2/R3 and R2-follow-up are closed. Product acceptance is pending; do not reopen historical failures from P4_REVIEW/P4_RECHECK or claim cloud/real PostgreSQL verification. Current3000 remains P3, not P4; no main merge authorization.

P0/P1 are accepted and merged. P2 including comment deletion is product accepted; P3 including age-only priority, conditional project status form and the suggestion Detail toggle is product accepted. Latest accepted app source is38e4901; c1441fd adds preview documentation. Main merge/PR #3 has not been authorized by the latest acceptance; do not merge it.

## Active rules
- Project-centered app; embedded experience, not independent Lesson adoption. Old adoption writes stay410; stored history remains.
- student / mentor / staff, four fictional switchable identities through x-demo-user-id. This is demo identity, not real authentication. Product UI is English.
- Keep authored summary/tags/reflection and all historical status content. Only the owner edits a project. Status form shows only selected status fields while retaining hidden/unsaved reflection.
- Staff manually refers one Mentor per question. Only that Mentor gives formal replies. Shared valid-post thread state controls workbenches, Awaiting reply and priority.
- Project owners may delete all project posts; post authors their own. Soft-deleted bodies must never appear through Inbox. Questions/referrals remain.
- P3_PRODUCT_REVISION.md supersedes deadline scoring/UI. Rank by project publication age / pending request age only; legacy dueAt remains stored/author-only compatibility API but has no score/advice effect. Keep exact microsecond ordering.
- Suggestions for your project remains system-generated, with original Edit project / question actions; its Detail explanation is collapsed by default.
- P4 adds all-role Activity Inbox and bounded automatic invitations. Notification and business writes must share transactions; acceptance does not assign Mentor or create a pickup. Automatic invitation opt-out does not mute activity. Follow the frozen P4 contract, no AI matching or fictional solved counts.

## Environment and collaboration
- P4 manual preview is now live at127.0.0.1:3001: app/build directory C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review, actual source372646c, independent persistent SQL, runner enabled, real OpenAI/gpt-6-luna configured and validated once. Read docs/P4_PREVIEW.md and .data/p4-preview-runtime.json before operations. This formerly disposable review directory is now active: never rebuild its.next, switch its commit, archive it or connect another process to its SQL while running. Preserve3000/P3 too.
- Preserve existing work; no reset/force-push or unrequested dependency changes. Report normally only once at complete READY; genuine blockers may add BLOCKED. Do not autonomously merge main or deploy.
- Current3000 preview is P3, app/build directory C:/Users/23678/.codex/workspaces/buckeye-baton-p3-detail; its database and user configuration are in buckeye-baton-p3-review. Read docs/P3_PREVIEW.md and the runtime manifest before any process operation. Do not build in an active service directory or touch its .next/.data/env. Old P1/P2 databases also remain protected. 3001 was stopped; recheck port occupancy.
- Coordinator checkout C:/Users/23678/.codex/workspaces/buckeye-baton is not the worker implementation directory. Own clone/build/ports/test database required.
- Next15.5.28 / TS / Node22 / Tailwind / pg. Explicit PGlite mode is single-process: never connect a second worker/CLI to the active directory.
- Run npm run typecheck, npm run test:backend, npm run build and npm run test:e2e as appropriate. NEXT_TELEMETRY_DISABLED=1 may be required locally. P4 real model calls0; existing P2 regressions use mock, do not read/copy keys.
- No .env.local, secrets, databases, node_modules or build artifacts in Git. Update project-docs via markers and record material decisions. Do not call local PGlite checks real PostgreSQL/Neon/AWS/public deployment verification.
- Historical rehearsal and old frontend/backend preparation branches were removed at user request. Recover old code from Git history if needed; design/ is reference, unapproved prototype features are not requirements.
