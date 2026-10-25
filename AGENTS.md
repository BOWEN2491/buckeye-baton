# Buckeye Baton — current agent entry

2026-10-25: user confirmed all P4 product revisions pass and explicitly authorized merging the complete accepted version into main. P0–P4 are product accepted. PR #3 was merged into main as3bf29b3 with accepted P2/P3/P4; the coordinator checkout now uses main. See docs/RELEASE_ACCEPTANCE.md; this status supersedes old no-merge/pending-product-acceptance notes.

Read project-docs/index.html, PROJECT_CONTEXT.md, DECISIONS.md, docs/PROJECT_OVERVIEW.md and docs/P4_PRODUCT_REVISION.md. Pickup-only invitations and remover-only removed-post notifications supersede the original P4 contract. Application source5a5fddf passed typecheck/build, backend20/20 and production browser23/23; subsequent commits are documentation only.

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
- Preserve active previews:3001/P4 app/build C:/Users/23678/.codex/workspaces/buckeye-baton-p4-product-revision, source5a5fddf. Database and .env.local remain in buckeye-baton-p4-review. Do not archive either directory, rebuild the active .next, switch the active checkout or open its PGlite from a second process. Read docs/P4_PREVIEW.md and .data/p4-preview-runtime.json before process operations.
- 3000/P3 app/build buckeye-baton-p3-detail and database/config buckeye-baton-p3-review remain protected. No preview/data/key changes are needed for the main merge.
- Next15.5.28 / TypeScript / Node22 / Tailwind / pg; PGlite is explicit, single-process local storage. Real PostgreSQL/Neon/AWS/public deployment/multi-instance operation remain unverified.
- No .env.local, keys, databases, node_modules or build artifacts in Git. Existing real model configuration may stay enabled for user actions; no additional paid calls are required by this merge.
- No reset/force-push or unrequested dependency changes. User authorized this merge; deployment and future merges still require applicable authorization. Preserve feature branches and worktrees unless cleanup is requested.
- Tests: npm run typecheck, npm run test:backend, npm run build, npm run test:e2e; NEXT_TELEMETRY_DISABLED=1 may be needed. Do not repeat unchanged application tests merely for documentation updates.
- Update project-docs via markers. History and old reports are retained; prefer current release/preview documents over old pending statuses.
