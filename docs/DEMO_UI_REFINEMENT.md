> Recommend badge preview update (2026-10-25): active3001 app/build is `C:/Users/23678/.codex/workspaces/buckeye-baton-recommend-badge`, source78155806c80aa07cd7b1e1895f27f2db014d50cc, Node37840. Uses the same protected P4-held database/config; see `.data/recommend-preview-runtime.json`. Supersedes the prior runtime below; do not rebuild active `.next`.

# Demo UI refinement — 2026-10-25

User requested three interface changes and a read-only explanation of current AI browsing introductions.

- Explore keeps Recommended ordering; positive-score cards display a compact Recommend badge. Scores and reasons stay off cards. Newest mode does not display the badge.
- Project detail keeps Recommended because as a native details/summary disclosure, closed initially and keyboard accessible. Owner suggestions keep their existing placement and actions.
- Shared date/time formatting uses en-US regardless of browser locale, keeping the existing local timezone behavior.
- Staff and Mentor workspace groups use question creation time, newest first. No Priority/Oldest controls or per-task score explanations are displayed. A new sort=newest API preserves exact database timestamp ordering. Legacy priority and oldest API requests remain compatible.
- AI generation, publication, confirmation and fallback rules were not changed. See AI_BROWSE_IMPLEMENTATION.md for pipeline, failure points and the observed SafeSight stale state.

## Verification

Typecheck and production build passed. Backend26/26 and production browser25/25 passed, including zh-CN browser locale, keyboard disclosure,390px, newest workspace API order, referral/reply flows and existing AI mocks. No real model calls were made. Browser plugin not available; repository Playwright was used with isolated database and local provider mocks on3811/3912/3913. Project-doc screenshots were regenerated against that isolated server.

## Preview and data

The3001 preview is upgraded from the preserved P5 database after a stopped-database backup. The original API project/user snapshot is stored in ignored .data/pre-ui-preview-api-snapshot.json. Runtime identity is recorded in .data/demo-ui-preview-runtime.json. Port3000 remains protected. No database schema changes, simulation import, main merge, or public deployment is part of this revision.

Live preview confirmed: app SHA56c61dbd55b60e50e253b59706a0bcc8116597bd, build-c6pnNww7xXiQXnxiIeNg, Node PID27404, hidden launcher42152. Backup p5-before-demo-ui-20261025 matched all1069 files. Public API snapshots before/after restart are identical for30 projects and8 users; Staff and Sarah sort=newest groups were checked online. Port3000 remains PID38224. PR6 awaits product acceptance.
