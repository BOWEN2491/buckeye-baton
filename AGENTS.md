> Recommend badge preview update (2026-10-25): active3001 app/build is `C:/Users/23678/.codex/workspaces/buckeye-baton-recommend-badge`, source78155806c80aa07cd7b1e1895f27f2db014d50cc, Node37840. Uses the same protected P4-held database/config; see `.data/recommend-preview-runtime.json`. Supersedes the prior runtime below; do not rebuild active `.next`.

> Latest preview (2026-10-25): user-requested UI refinement runs on3001 from `C:/Users/23678/.codex/workspaces/buckeye-baton-demo-ui`, application SHA `56c61dbd55b60e50e253b59706a0bcc8116597bd`, build `-c6pnNww7xXiQXnxiIeNg`. Same P4-held database/config, pre-restart backup `p5-before-demo-ui-20261025`. Do not rebuild the active `.next` or open its database from a second process. PR6 is unmerged; P5 itself is accepted/merged. See docs/DEMO_UI_REFINEMENT.md and the active app `.data/demo-ui-preview-runtime.json`. This supersedes older3001 runtime notes below.

# Buckeye Baton — current agent entry

2026-10-25: P4 accepted and merged through PR #3 as3bf29b3. P5 is implemented on codex/p5-implementation at9093dbb and is now running on3001 for manual product acceptance; P5 is not merged. See docs/P5_PREVIEW.md for live runtime and protected data details.

Read project-docs/index.html, PROJECT_CONTEXT.md, DECISIONS.md, docs/PROJECT_OVERVIEW.md, docs/P4_PRODUCT_REVISION.md and docs/P5_PREVIEW.md. Pickup-only invitations and remover-only removed-post notifications supersede the original P4 contract. P5 source is 9093dbb; it passed typecheck/build, backend26/26, production browser24/24 and simulation2/2. Keep the active preview build stable during manual acceptance.

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
- Preserve active previews:3001/P5 app/build in this worktree, source9093dbba0084dcbe80d2ab1edcca9ce0b8fd8aaa. It uses the existing P4 database and protected .env.local in buckeye-baton-p4-review; the pre-upgrade backup is in that holder .data/p4-before-p5-upgrade-20261025. Do not rebuild the active .next, switch the active checkout, or open its PGlite from another process. Read docs/P5_PREVIEW.md and .data/p5-preview-runtime.json before process operations.
- 3000/P3 app/build buckeye-baton-p3-detail and database/config buckeye-baton-p3-review remain protected. No preview/data/key changes are needed for the main merge.
- Next15.5.28 / TypeScript / Node22 / Tailwind / pg; PGlite is explicit, single-process local storage. Real PostgreSQL/Neon/AWS/public deployment/multi-instance operation remain unverified.
- No .env.local, keys, databases, node_modules or build artifacts in Git. Existing real model configuration may stay enabled for user actions; no additional paid calls are required by this merge.
- No reset/force-push or unrequested dependency changes. User authorized this merge; deployment and future merges still require applicable authorization. Preserve feature branches and worktrees unless cleanup is requested.
- Tests: npm run typecheck, npm run test:backend, npm run build, npm run test:e2e; NEXT_TELEMETRY_DISABLED=1 may be needed. Do not repeat unchanged application tests merely for documentation updates.
- Update project-docs via markers. History and old reports are retained; prefer current release/preview documents over old pending statuses.
