# Accepted P0–P4 release — 2026-10-25

The user confirmed all P4 product changes pass and explicitly authorized merge into main. [PR #3](https://github.com/BOWEN2491/buckeye-baton/pull/3) was expanded from its older P2-only integration scope and **merged into main** with all accepted P2/P3/P4 changes. Merge commit: **3bf29b3782bb42634385f13119a3f5bfc5e73378**. Local coordinator checkout is now on main. The older main already contains P0/P1.

Final application source: **5a5fddfa527b2dff509431ad05bcaa36a8c7dc80**. Later commits before release update documentation/screenshots only. Verification on that application: typecheck and production build passed, backend20/20, browser23/23 including390px and all four identities. Final manual product acceptance is confirmed by the user in this chat.

The accepted behavior includes owner-reviewed AI introductions/tags, Mentor Awaiting reply, owner/author comment deletion, age-only explainable priority, conditional status forms, Suggestions Detail, all-role Activity Inbox and pickup-only invitations. Help invitations and Interested helpers are retired. Removed-post notifications are hidden from recipients other than the remover. Legacy records remain stored.

Merge preserves Git history, existing3000/P3 and3001/P4 processes, all databases and API configuration. Preview remains application5a5fddf; a merge commit does not imply a preview restart or deployment. No new real model calls are needed.

Real PostgreSQL/Neon/AWS/public deployment, multi-instance operation and serverless scheduling are not verified. Current invitations runner requires a persistent Node process. Demo identities are not real authentication.

See P4_PRODUCT_REVISION.md, P4_PREVIEW.md and earlier acceptance reports for evidence. Historical “do not merge” and “awaiting product acceptance” notes describe earlier stages and are superseded by this explicit approval.
