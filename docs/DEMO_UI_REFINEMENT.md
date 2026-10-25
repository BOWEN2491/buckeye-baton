# Demo UI refinement — 2026-10-25

User requested three interface changes and a read-only explanation of current AI browsing introductions.

- Explore keeps Recommended ordering but cards no longer render recommendation scores/reasons.
- Project detail keeps Recommended because as a native details/summary disclosure, closed initially and keyboard accessible. Owner suggestions keep their existing placement and actions.
- Shared date/time formatting uses en-US regardless of browser locale, keeping the existing local timezone behavior.
- Staff and Mentor workspace groups use question creation time, newest first. No Priority/Oldest controls or per-task score explanations are displayed. A new sort=newest API preserves exact database timestamp ordering. Legacy priority and oldest API requests remain compatible.
- AI generation, publication, confirmation and fallback rules were not changed. See AI_BROWSE_IMPLEMENTATION.md for pipeline, failure points and the observed SafeSight stale state.

## Verification

Typecheck and production build passed. Backend26/26 and production browser25/25 passed, including zh-CN browser locale, keyboard disclosure,390px, newest workspace API order, referral/reply flows and existing AI mocks. No real model calls were made. Browser plugin not available; repository Playwright was used with isolated database and local provider mocks on3811/3912/3913. Project-doc screenshots were regenerated against that isolated server.

## Preview and data

The3001 preview is upgraded from the preserved P5 database after a stopped-database backup. The original API project/user snapshot is stored in ignored .data/pre-ui-preview-api-snapshot.json. Runtime identity is recorded in .data/demo-ui-preview-runtime.json. Port3000 remains protected. No database schema changes, simulation import, main merge, or public deployment is part of this revision.
