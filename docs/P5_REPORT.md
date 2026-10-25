# P5 implementation and local verification

Implemented on `codex/p5-implementation`, based on accepted main `f2312ee`. Contract: [P5_CONTRACT.md](P5_CONTRACT.md); wire/API details: [API_CONTRACT.md](API_CONTRACT.md). Product acceptance and main merge are separate from these automated checks.

## Delivered behavior

- Mentor-owned expertise profile with exactly five fixed domains. Requested questions and explicit follow-ups enqueue classification; Staff sees independent relevance scores and up to three candidates sorted by strongest matched domain, live Awaiting reply and stable ID. Empty profiles/zero scores are omitted; low relevance is labeled. Referral always requires a human choice and reason.
- New posts and pickups require a GitHub repository root. Public repository metadata/commit/README/languages/up to two root manifests combine with saved project description/progress/reflection to generate private introductions and fixed labels. Sources expose actual reads and truncation. Owner edits sentences and confirms; labels cannot be supplied by clients. Stale publication falls back to authored text and no public labels.
- Incremental expertise/source/classification/job storage preserves old content. Durable single-task Node loop recovers interrupted processing, coalesces source changes and checks hashes before saving. External network work does not hold the business transaction. Transient retries are bounded; failure leaves authored data intact.
- Pickup invitations use confirmed current version5 Topics on both sides. P4 retired help invitations, deletion visibility, manual referral and Inbox guards remain enforced.

## Verification

All automated calls are mock-only; zero real AI calls. No preview data or `.env.local` was opened by the tests.

| Check | Result |
|---|---|
| `npm run typecheck` |Passed |
| `npm run build` with `NEXT_TELEMETRY_DISABLED=1` |Passed, production Next build (coordinator) |
| `npm run test:backend` |26/26 passed, including repository freshness and failure-time retry regressions |
| `npx tsx --test tests/product-simulation.test.ts` |2/2 passed |
| Production Playwright |24/24 passed after all review fixes, including immediate detail-header refresh (2.6min) |

Playwright uses separate production `next start`, temporary PGlite, model port3909 and GitHub port3910; application port3810. Explicit fake model configuration overrides any local config. Browser plugin is unavailable, so repository Playwright provides the browser verification.

Initial browser failures distinguished fixture changes from product defects: old `maps` expectations became fixed-domain `front-end`, pickup forms gained required repository inputs, GitHub mock metadata needed a valid `size`, and exact README text correctly included a truncation marker when the mock reported an inflated size. Product defects found during review were Mentor navigation overflow after adding My expertise, stale detail-header labels after confirmation, repository source changes not invalidating publication, and retry waits measured from task start. Mobile wrapping, parent refresh, repository-material identity and failure-time delay fixes now have regressions.

## Simulation adapter

Independent transactional batch `sim-20261025`:20 projects (8 ongoing/6 finished/6 paused,10 owned by each student),4 new Mentors,30 questions,60 posts (44 comments/12 formal replies/4 follow-ups),16 manual referrals and3 pickup relations. New Mentor loads are4/2/1/0, Sarah gains1 pending question. Each new Mentor has formal reply history.

P5 additions are20 explicitly labeled **simulation** introductions,24 simulation score snapshots and44 **ready** job records. Repository URLs are fictional syntactic placeholders, no commit/files were read, and no pending bulk model work is created. The script uses production source hashes and normal notification recipient helpers, preserves original rows, rejects partial collisions, and skips a complete repeated batch without overwriting edits. The stopped-preview wrapper snapshots prior business/AI/cache rows and verifies them unchanged. On 2026-10-25 the committed P5 preview was started on the existing 3001 database, migrations completed, and the simulation batch was imported only while the app was stopped. The import verified every preexisting row across all16 tracked tables unchanged. A byte-for-byte backup was saved at C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review/.data/p4-before-p5-upgrade-20261025 (1,047 files). See docs/P5_PREVIEW.md; port3000 remained untouched.

## Remaining limits

Only local single-connection PGlite and sustained single Node have been exercised. Real PostgreSQL contention, multiple instances, real GitHub/provider rate-limit/outage behavior, Neon/AWS/public deployment and serverless scheduling remain unverified. Demo identities are not authentication; public repository ownership is asserted, not OAuth verified. A recommendation is relevance guidance, not a probability of solving a question.
