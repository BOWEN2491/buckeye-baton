# P5 frozen implementation contract

Approved user plan, frozen 2026-10-25. P5 builds on main f2312ee. It supersedes P2 free-form public tags and process-local generation only where described below. P4 remains pickup-only; no automatic Mentor assignment or help invitations. Product UI is English.

## Shared vocabulary and data

`src/shared/p5-types.ts` is the wire reference. EXPERTISE has exactly front-end, back-end, algorithm, database, brainstorming. TECHNOLOGIES has the user's exact 24 values. Reuse exported validators on server and client. Extend User with optional expertise for source compatibility; user responses include the actual stored list (initially empty, not inferred from old tags). Mentor profile permits an empty selection. Scores contain all five keys, each `{score: number 0..100, reason: string}`; scores are independent relevance, not probability or success claims.

QuestionRecommendations is `{status,error,scores,candidates,asOf}`. Status is pending/processing/ready/failed/stale, or null for legacy/not requested. Error is null or safe `{code,message}`. No stale scores/candidates are presented as current. A candidate is `{mentor,matchedExpertise,score,reason,awaitingReply,lowRelevance}`. matchedExpertise lists the Mentor's domains attaining their maximum score. Sort maximum domain score descending, then current shared Awaiting reply ascending, then Mentor ID ascending. Exclude zero score and unset expertise; return at most three, never fill artificially. Mark score below40 Low relevance. Expertise/workload changes recalculate ranking without model calls. UI always retains the all-Mentors manual selection and requires a reason; it never preselects or auto-refers.

## HTTP contract

All success responses use `{data: ...}` and errors `{error:{code,message}}`; preserve existing status conventions and x-demo-user-id authorization.

| Method/path | Authorization and response |
| --- | --- |
| GET /api/mentors/me/expertise | Mentor only; ExpertiseProfile `{expertise: Expertise[]}` |
| PATCH /api/mentors/me/expertise | Mentor only, updates only self; same strict input and output |
| GET /api/project-questions/:id/recommendations | Staff only; QuestionRecommendations |
| POST /api/project-questions/:id/analysis/retry | Question author or Staff, empty object input; 202 QuestionRecommendations (author may receive status with empty candidates; Staff receives full result) |
| Existing GET project introduction editor | Owner only; P5IntroductionEditor |
| Existing POST introduction generate | Owner only, empty object input; enqueues and returns202 P5IntroductionEditor rather than awaiting provider |
| Existing POST introduction publish | Owner only, strict P5PublishIntroductionInput `{draftId,sourceHash,sentences}`; returns editor; caller topics/technologies/tags are rejected |

Existing introduction endpoints keep their route paths. Draft and published objects use version5, sentences/topics/technologies/sources, and read-only tags projection of topics followed by technologies. Editor has status/error/sources explicitly nullable. Null status means never requested, not perpetually pending. Published metadata includes stale. Legacy P2 drafts/published tags stay stored but are not valid P5 publication/evidence; editor projects them as absent. Extend existing p2 types to the new shape or alias the P5 interfaces in backend implementation so frontend has one contract. Shared aliases must not restore manual labels.

Public project tags are only the current, owner-confirmed version5 projection; otherwise `[]`. Public introduction is absent for legacy/unconfirmed or stale content, and Explore displays authored summary plus Topics pending review. Sources show actual repo URL, resolved commit (null for empty repo), read time, actual fetched files with truncation flags, missingREADME, and explicit evidence origin github/mock/simulation. Never claim that missing files were fetched. Simulation/mock evidence is visibly labeled; it must never masquerade as live analysis.

## Project writes and GitHub source

New projects and pickups require codeUrl pointing to the caller's own public GitHub repo root. PickupInput gains codeUrl. Accept only HTTPS github.com/owner/repo, normalize trailing slash/.git, reject credentials, query, fragment and other hosts/path shapes. Root URL syntax is checked before save; public accessibility is verified in background, so fetch/model failures do not discard a post. Ownership of a public repository is the user's assertion in this demo, not verified OAuth ownership. Legacy project edits may omit codeUrl; generation requires it. Reject manual tags on new public project create/update/pickup writes; preserve stored legacy tags privately. Remove tag inputs from forms.

Fetch public GitHub metadata, default branch resolved commit, README, languages and at most two supported root manifests. Pin source files to that commit. Do not traverse or execute code. Bound time/size, cache sources, report missing/empty/429/403 rate-limits accurately. Supported manifest policy and concrete limits must be documented by backend implementation and tested with mocks. Provider input combines actual source material and authored title/summary/status/reflection, including progress. Output has 1–3 sentences,1–3 unique Topics,0–6 unique Technologies; reject unknown labels. Technologies require source evidence; absence is allowed. Do not turn plans into claimed completed features. Owner may edit sentences only and must confirm before publication. Source changes stale current publication, fall back to authored summary, and enqueue a replacement draft. Failed reads/model runs retain authored data and expose Retry.

## Persistent work and invalidation

Incremental, repeatable migrations add expertise, source snapshots, classification and durable jobs without resetting old records. New Mentor-requesting questions and valid explicit follow-ups enqueue analysis in the same transaction as the business action; ordinary discussions/comments do not. Input includes current project context, original question and valid follow-up with its preceding formal reply. Deleting a relevant follow-up or changing project context invalidates old results and schedules current work where applicable. Hash exact current source inputs; no legacy tag input and no deleted bodies. No automatic replacement of an existing referral.

Persistent AI loop is separate from invitations, enabled only by explicit `AI_ANALYSIS_RUNNER_ENABLED=1` in a sustained Node runtime; never during build. Check every5s, one network task at a time, no open SQL transaction during provider fetch. Coalesce content changes, deduplicate equal version, check hashes on result write, recover interrupted processing at startup. Model timeout30s; transient errors retry after30s then120s (at most two automatic retries). Invalid output/configuration needs manual retry. Manual retry does not remove user content. Never expose provider secrets/raw authorization in errors, fixtures or evidence.

Pickup invitation matching now requires both source and candidate's current, confirmed version5 Topics. Match Topics; Technologies are supporting evidence only. Legacy tags cannot qualify new invitations; old invitation history remains. Preserve existing permission, no-pickup age, opt-out, quota and dedup rules.

## Work boundaries and verification

Backend owns db/schema, src/server, src/shared, src/instrumentation and API routes. Frontend owns non-API pages, components and CSS. Tests/integration owner owns mocks, automated tests and simulation scripts. Frozen interfaces change only by coordinator communication.

First verify core with isolated PGlite + local GitHub/model mocks, typecheck/backend/build/production browser390px and four-role regression. Verify score sorting, unknown/malformed output, auth, stale follow-up deletion, dynamic loads/expertise, no auto-referral, source provenance/limits, owner confirmation and label tampering, job dedup/restart/retry and old result race. No real provider calls for automated or bulk tests. Reuse existing real model configuration only for explicitly authorized preview/user actions; never read/copy .env secrets. Real PostgreSQL/multiple instances remain unverified until actually tested.

Preserve3000/P3 and3001/P4 while implementing. After core tests, backup stopped3001 database, upgrade only3001 with same data and protected existing configuration. No main merge/deployment. Simulation scripts copied to this worktree are deferred until core pass; then adapt20 projects,4 Mentors,30 questions,60 posts and3 pickup links with explicit mock/simulation evidence. Do not import fixtures or call real models in bulk before that gate.
