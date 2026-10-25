# Buckeye Baton — agent entry

Read project-docs/index.html, PROJECT_CONTEXT.md, DECISIONS.md and docs/PROJECT_OVERVIEW.md before changes. Current execution: **P4 single full-stack Agent**, docs/P4_AGENT_TASK.md + docs/P4_CONTRACT.md + docs/P4_START_PROMPT.md. Implementation baseline is latest origin/codex/p4-integration; use codex/p4-implementation in your own clone/worktree. Do not start from old main, which does not contain accepted P2/P3.

P4 revised candidate2ad5607 is independently reviewed9/10, not accepted or integrated. R1/R3 and the three original R2 scenarios pass, but R2-follow-up (Load more interrupted by automatic refresh leaves loading stuck) remains. Read docs/P4_RECHECK.md; continue codex/p4-implementation from2ad5607 and repair only this request coordination. Original baseline remains1c3ed64; coordinator commits add review documents only.

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
- Preserve existing work; no reset/force-push or unrequested dependency changes. Report normally only once at complete READY; genuine blockers may add BLOCKED. Do not autonomously merge main or deploy.
- Current3000 preview is P3, app/build directory C:/Users/23678/.codex/workspaces/buckeye-baton-p3-detail; its database and user configuration are in buckeye-baton-p3-review. Read docs/P3_PREVIEW.md and the runtime manifest before any process operation. Do not build in an active service directory or touch its .next/.data/env. Old P1/P2 databases also remain protected. 3001 was stopped; recheck port occupancy.
- Coordinator checkout C:/Users/23678/.codex/workspaces/buckeye-baton is not the worker implementation directory. Own clone/build/ports/test database required.
- Next15.5.28 / TS / Node22 / Tailwind / pg. Explicit PGlite mode is single-process: never connect a second worker/CLI to the active directory.
- Run npm run typecheck, npm run test:backend, npm run build and npm run test:e2e as appropriate. NEXT_TELEMETRY_DISABLED=1 may be required locally. P4 real model calls0; existing P2 regressions use mock, do not read/copy keys.
- No .env.local, secrets, databases, node_modules or build artifacts in Git. Update project-docs via markers and record material decisions. Do not call local PGlite checks real PostgreSQL/Neon/AWS/public deployment verification.
- Historical rehearsal and old frontend/backend preparation branches were removed at user request. Recover old code from Git history if needed; design/ is reference, unapproved prototype features are not requirements.
