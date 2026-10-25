> Current product override (2026-10-25): see [P4_PRODUCT_REVISION.md](P4_PRODUCT_REVISION.md). Automatic invitations are pickup-only. Removed-post notifications are hidden from recipients other than the remover.

# Buckeye Baton — API contract

## P5 current implementation — supersedes free-form P2 tags

Frozen interfaces: [P5_CONTRACT.md](P5_CONTRACT.md), `src/shared/p5-types.ts`. P4 pickup-only and removed-post visibility rules remain in force; historical P2/P4 sections below describe earlier contracts.

| Method / path | Who / input | Result |
|---|---|---|
| GET `/api/mentors/me/expertise` | Mentor self |200 `{expertise}` |
| PATCH `/api/mentors/me/expertise` | Mentor self; strict `{expertise}` |200 saved profile; zero to five unique fixed domains |
| GET `/api/project-questions/:id/recommendations` | Staff |200 status/error, all five independent scores, up to three candidates, asOf |
| POST `/api/project-questions/:id/analysis/retry` | asker or Staff; `{}` |202 queued status; asker receives no scores/candidates |
| GET `/api/projects/:id/introduction` | owner |200 editor with private version5 draft, current publication, status/error/sources |
| POST `/api/projects/:id/introduction/generate` | owner; `{}` |202 enqueued editor; no network request inside the business transaction |
| PATCH `/api/projects/:id/introduction` | owner; `{draftId,sourceHash,sentences}` |200 confirmed introduction; labels copied only from the identified server draft |

- Expertise is exactly `front-end/back-end/algorithm/database/brainstorming`. Score range0–100 is relevance, never success probability. Candidate score is the maximum of the Mentor's selected domains; order is score descending, current Awaiting reply ascending, then Mentor ID. Zero-score/unset profiles are omitted, scores below40 are labeled Low relevance. Manual referral and reason remain mandatory; AI never assigns or replaces a referral.
- New project and pickup writes require a normalized public `https://github.com/owner/repo` URL in `codeUrl`. Legacy project edits may omit it. Repository ownership is the demo user's assertion, not OAuth verification. Manual `tags/topics/technologies` inputs are rejected; existing stored tags remain private historical data.
- Introduction labels use fixed Topics1–3 and Technologies0–6. Drafts include actual repo/commit/read time/file/truncation provenance. Only current owner-confirmed version5 labels are public; stale/legacy/unconfirmed labels project to `[]`, and authored summary stays the fallback. Source-read failures do not undo project creation.
- GitHub reads metadata, default-branch commit, languages, README and at most two root manifests (`package.json`, `pom.xml`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `build.gradle`, `Dockerfile`, first two found). Files are pinned to the commit, responses capped64KiB, file text12,000 code points and combined text30,000, timeout10s, cache5minutes. No traversal or execution. Mock/simulation provenance is explicitly labeled and is not live GitHub evidence.
- Durable tasks use `pending/processing/ready/failed/stale`. Source changes coalesce/invalidate; stale model responses cannot overwrite current content. New Mentor requests and explicit follow-ups enqueue automatically; ordinary discussions/comments do not. `AI_ANALYSIS_RUNNER_ENABLED=1` starts a separate continuous-Node loop every5s; model timeout30s, transient retries30s then120s, at most two automatic retries. Invalid output/config requires manual retry.
- Publication freshness also checks the last observed repository snapshot (commit and actual supplied material, excluding read time). Reading changed sources hides old labels and rejects old-tab confirmation; a same-content cache refresh does not invalidate it. GitHub is re-read during generation after cache expiry, not watched continuously. Retry delays begin when the failed request finishes, so a slow failed read does not make its retry immediately due.
- Pickup matching now uses both projects' valid confirmed version5 Topics only, never legacy manual tags. Historical invitations remain stored; new help invitations stay retired.

See [P5_TEST_REPORT.md](P5_TEST_REPORT.md) and [P5_REPORT.md](P5_REPORT.md) for verification and remaining limits.

## P4 endpoints — independently accepted locally10/10, product acceptance pending

Rules: [P4_CONTRACT.md](P4_CONTRACT.md). Types `src/shared/p4-types.ts`. Server: `src/server/inbox.ts` (Activity, listing, read), `src/server/invitations.ts` (eligibility, matching, limits, dispatch, responses, helpers, status), `src/server/invitation-runner.ts` + `src/instrumentation.ts` (runner). Tables (additive): `inbox_items` (UNIQUE `("recipientId","eventKey")`, CHECKs, recipient/target indexes), `inbox_preferences`, `invitation_dispatch_state` (singleton row = lock + last completed/failed).

| Method / path | Who | Result |
|---|---|---|
| GET `/api/inbox?filter=all\|unread\|invitations&limit=1–50&cursor=<item id>` | self | 200 `InboxPage`, newest first by exact `createdAt` desc, id desc; foreign/unknown cursor 400 |
| PATCH `/api/inbox/:id` `{read:true}` | recipient | 200 item; idempotent; others 404 |
| GET / PATCH `/api/inbox/preferences` `{automaticInvitations}` | self | 200; GET never writes; off cancels pending invitations |
| POST `/api/invitations/:id/respond` `{action:'accept'\|'ignore'}` | recipient | 200 `InvitationItem`; same action again returns current; opposite or no longer valid 409 `INVITATION_UNAVAILABLE`; others 404 |
| GET `/api/project-questions/:id/interested-helpers` | Staff | 200 accepted help invitations for the current waiting round; others 403 |
| GET `/api/invitations/status` | Staff | 200 `InvitationRunnerStatus`; others 403 |

- Activity is written in the same transaction as the question, post or referral (`question:<id>`, `post:<id>`, `referral:<id>` event keys); recipients follow the contract matrix, are de-duplicated with merged reasons, and exclude the actor. Rejected writes and duplicate referrals add nothing. Previews (≤160 code points) are read live; deleted posts show `removed:true`, `preview:null`.
- Invitations: `pickup` (Paused, no successor, shared ≥14 days; Students) and `help` (needs_referral/awaiting_reply, current round waiting ≥3 days; Students or Mentors), matched by normalized author tags with Finished-project or formal-reply evidence, ranked by matched tags, evidence projects, user id. Limits: recipient 1/24 h and 3/7 days, target 1/24 h and 3 lifetime, one per recipient+kind+target forever (`invite:<kind>:<targetId>`). Expiry 7 days; cycle key = question id or first unanswered follow-up id. GET computes effective status without writing; dispatch, responses and related writes persist expired/cancelled.
- Locking: dispatch, responses, preference changes, question/post/referral writes, post deletion, pickup and project PATCH take the `invitation_dispatch_state` row lock first.
- Runner: `INVITATION_RUNNER_ENABLED=1`, Node runtime only, skipped during `next build`; checks at start and 60 s after each completion; failures roll back and record `lastFailureAt`/`DISPATCH_FAILED`; there is no public dispatch endpoint.

## Current status

P3 product revisions, including age-only priority and the Detail toggle38e4901, have passed user acceptance. Current P3 UI has no deadline inputs or scoring; the age-only addendum below overrides the original deadline descriptions. Main merge remains pending explicit authorization; current3000 runs P3, not P1.

**P4 application372646c is independently accepted locally10/10 and integrated in codex/p4-integration.** See[P4_ACCEPTANCE.md](P4_ACCEPTANCE.md). All review repairs are closed; typecheck/build, backend20/20 and production e2e23/23 pass. User product acceptance and main merge remain pending. Current3000 still runs P3; no P4 preview has replaced it.

## P3 product revision — age-only priority

See[P3_PRODUCT_REVISION.md](P3_PRODUCT_REVISION.md). Priority reasons now only `no_pickup` / `waiting_for_reply`, advice codes only `improve_handoff` / `narrow_question`. Legacy dueAt is retained in storage/responses and author-only PATCH for compatibility, but has **zero effect on scores, ordering and advice**. Current UI creates questions with dueAt:null and has no reply-date input/editor/display. Maximum question score30, project50; all other opt-in shapes, exact tie-breaks and P1 permissions stay unchanged. Old deadline-based descriptions below refer to the first P3 version and are superseded by this addendum.

## P3 endpoints — independently and product accepted locally

Final4839e77 is integrated on codex/p3-integration, with coordinator J1–J10 passing; see[P3_ACCEPTANCE.md](P3_ACCEPTANCE.md). main is unmerged. Exact microsecond tie-break keys stay internal; public ISO dates and response shapes remain unchanged.

Rules: [P3_CONTRACT.md](P3_CONTRACT.md). Types `src/shared/p3-types.ts`; the only scoring/ordering/advice module is `src/server/priority.ts` (server clock, injectable in tests only); data glue `recommend`, `workbench(sort)`, `projectPriorityDetail`, `updateDueAt` in `src/server/relay.ts`, all reading the shared `threads()` (deleted posts excluded). No schema change, no stored scores, no AI calls.

| Method and path | Identity | Success |
|---|---|---|
| GET `/api/projects?q=&status=&sort=recommended` | public | 200 `RecommendedProject[]` (BrowseProject + `priority`), score desc then createdAt desc, id asc; all matching projects incl. 0 |
| GET `/api/projects?sort=newest` / no sort | public | 200 original `BrowseProject[]`, createdAt desc, id asc |
| GET `/api/workbench?sort=newest` | Staff / Mentor | 200 original `Workbench`, each group in reverse question creation order at database precision; current workspace UI uses this mode only |
| GET `/api/workbench?sort=priority` | Staff / Mentor | 200 four-array `PrioritizedWorkbench`; per group pending first (score desc, pendingSince, createdAt, id), others after in createdAt,id with `priority:null` |
| GET `/api/workbench?sort=oldest` / no sort | Staff / Mentor | 200 original `Workbench` |
| GET `/api/projects/:id/priority` | public | 200 `ProjectPriorityDetail` (priority, per-question priority, advice); 404 unknown |
| PATCH `/api/project-questions/:id` | asking Student | `{dueAt: future ISO Z \| null}` strict → 200 `QuestionThread`; 401 / 404 / 403 (incl. project owner) / 400 |

- Unsupported `sort` (including empty) → 400 `INVALID_INPUT`. Project detail keeps its four keys; question GET/write responses keep `QuestionThread`.
- Points: no-pickup Paused (no relation at all) `min(20, 5 × full weeks since createdAt)`; pending question (`needs_referral`/`awaiting_reply`) `min(30, 5 × full days since pendingSince)`; a project adds only its single highest question, maximum50. No dueAt points. Reasons always sum to the score.
- pendingSince: question.createdAt while no valid mentor reply; otherwise the first valid follow-up after the last valid mentor reply (shared SQL order).
- Advice: `improve_handoff` (Paused, no pickup, shared ≥14 days), `narrow_question` (pending ≥3 days). No date advice.
- Pages: Explore Recommended/Newest with reasons, Updated/Refresh and rules; workbench Priority/Oldest first; project "Recommended because" and "Suggestions for your project" with collapsed Detail explanation and original action links. No reply-date editor/display.

## Product acceptance addendum: project comment deletion

User-authorized scope update: [COMMENT_DELETION.md](COMMENT_DELETION.md). `DELETE /api/project-posts/:id` returns 200 `{data: QuestionThread}`. Only the post author or source project's owner may delete; a question author has no additional moderation rights. Missing identity401, forbidden403, missing post404. Successful retries return200 without replacing the original deletion audit.

The UI confirms deletion. Comments, explicit follow-ups and formal Mentor replies are covered; questions and referral records remain. Deleted posts are excluded from public threads and the common queue/workload calculation, with original rows retained via nullable deletedAt/deletedBy columns. This supersedes the earlier exclusion of post deletion; post editing is still deferred.

## P2 endpoints — independently and product accepted locally, main merge pending

P2提交df5f050已通过总控H1–H10验收，集成于codex/p2-integration；证据见[P2_ACCEPTANCE.md](P2_ACCEPTANCE.md)。main包含P0/P1，后续协调线包含已验收P2/P3；当前3000为P3。真实PostgreSQL/云端未验证。

Rules: [P2_CONTRACT.md](P2_CONTRACT.md). Types `src/shared/p2-types.ts`; shared Zod `src/shared/p2-validation.ts` (model output, confirmation and client editor); handlers `src/server/introductions.ts`, `src/server/ai.ts`, `mentorWorkload` in `src/server/relay.ts`.

| Method and path | Identity | Input | Success |
|---|---|---|---|
| GET `/api/projects` | public | `q`, `status` | 200 `BrowseProject[]` (Project + `introduction: {sentences,tags,reviewedAt,stale} \| null`) |
| GET `/api/projects/:id/introduction` | owning Student | — | 200 `IntroductionEditor` |
| POST `/api/projects/:id/introduction/generate` | owning Student | `{}` only | 200 `IntroductionEditor` with new draft |
| PATCH `/api/projects/:id/introduction` | owning Student | `PublishIntroductionInput` | 200 `IntroductionEditor` with confirmed version |
| GET `/api/mentors/workload` | Staff | header only | 200 `MentorWorkloadResult` |

- Order of checks: identity (401) → project exists (404) → owner Student (403) → input (400) → in-progress lock (409 `GENERATION_IN_PROGRESS`) → configuration (503 `AI_UNAVAILABLE`). Bad input never reaches the model.
- `sourceHash` = SHA-256 of sorted-key JSON of title, summary, courseOrClub, term, tags, status, reflection (null kept as null). Generation re-checks it in a short transaction after the model returns (409 `INTRODUCTION_STALE`, nothing written). Confirmation locks project + introduction rows: other draft id → 409 `DRAFT_CONFLICT`; hash changed → 409 `INTRODUCTION_STALE`.
- Validation: 1–3 sentences, each one English sentence by `Intl.Segmenter`, ≤280 chars, ≤600 total; tags trimmed, lowercased, 1–32 chars, no line breaks, deduplicated to 1–6; no extra fields.
- Upstream: missing config or HTTP/network failure 503 `AI_UNAVAILABLE`; 30 s abort 504 `AI_TIMEOUT`; refusal, `status` ≠ `completed`, bad JSON or failed validation 502 `AI_INVALID_OUTPUT`. One request per click, no retries. Upstream bodies, keys and stacks are not returned.
- Browsing: a published introduction whose hash no longer matches is returned with `stale: true`, and cards then show the authored summary/tags. GET never calls the model or writes. Public responses exclude drafts, draft ids, model names and reviewer ids.
- Storage: `project_introductions("projectId" PK/FK, draft jsonb, published jsonb, "updatedAt")`, added with `CREATE TABLE IF NOT EXISTS`; latest draft and latest confirmed version only.
- Provider: OpenAI Responses API `POST {OPENAI_BASE_URL or https://api.openai.com/v1}/responses` via native fetch with `text.format = {type:'json_schema', strict:true}`, `store:false`. Env: `OPENAI_API_KEY`, `OPENAI_PROJECT_INTRO_MODEL`, optional `OPENAI_BASE_URL` (Playwright points it at a local mock).
- Workload: every `role='mentor'` user, sorted by name then id, with the number of distinct referred questions whose P1 thread state is `awaiting_reply` (same `threads()`/`threadState` as the Mentor workbench). Student/Mentor 403, no header 401. `asOf` is server time.

> **版本边界（2026-10-24）：v2 第一轮项目浏览与总结编辑之上，codex/p1-implementation 分支实现了 P1 接棒、项目问题、人工引荐、导师回复与工作台（见下文“P1 relay endpoints”）。** P1 已通过总控独立本地验收与用户产品验收，并经 PR #2 合入 main；云端及真实 PostgreSQL 多连接仍未验证。独立 Lesson 页面和采用功能已退出产品。规则依据 P1_CONTRACT.md，完整目标见 MVP_SPEC.md / ACCEPTANCE.md。

## P1 relay endpoints — accepted and merged into main

Types: `src/shared/relay-types.ts` (PickupInput, RelayLink, RelayProjectDetail, ProjectQuestion, ProjectPost, ProjectReferral, QuestionThread, Workbench, QuestionInput, PostInput, ProjectReferralInput). Handlers: `src/server/relay.ts`; shared request helpers: `src/server/http.ts`.

| Method and path | Identity | Input | Success |
|---|---|---|---|
| GET `/api/projects/:id` | public | — | 200 `RelayProjectDetail` `{project,lessons,source,successors}` |
| POST `/api/projects/:id/pickups` | Student | `PickupInput` | 201 new project `RelayProjectDetail`; 200 same result on retry |
| GET `/api/projects/:id/questions` | public | — | 200 `QuestionThread[]` |
| POST `/api/projects/:id/questions` | Student | `QuestionInput` | 201 `QuestionThread` |
| POST `/api/project-questions/:id/posts` | any demo identity | `PostInput` | 201 `QuestionThread` |
| POST `/api/project-questions/:id/referral` | Staff | `ProjectReferralInput` | 201 `QuestionThread` |
| GET `/api/workbench` | Staff or Mentor | header only | 200 `Workbench` |

- **Pickup**: any Student (including the source owner) from a Finished/Paused source. Creates an Ongoing project owned by the caller: title from input, summary = goal, courseOrClub/term/tags copied from the source, code/demo links null, empty reflection. The relation (`project_relations`) stores source, pickupType, creation-time title and goal; later project edits do not rewrite it. Source content, status and owner are never changed.
- `requestId` must be a UUID, unique per `(ownerId, requestId)`. Same key + same source/type/title/goal → 200 with the existing project; same key + any difference → 409 `REQUEST_CONFLICT`. Concurrent duplicates create one project (transaction + unique constraint, re-read on conflict). Ongoing source → 409 `SOURCE_ONGOING`. Missing source → 404.
- **Questions**: Student only, any project in any state. title 1–160 (trimmed), body 0–10000, `wantsMentor` boolean, `dueAt` null or ISO UTC datetime with `Z` that is in the future (otherwise 400).
- **Posts**: `comment` by any identity; `follow_up` only by the question author (else 403); `mentor_reply` only by the referral's Mentor (else 403, also before any referral). body 1–10000.
- **Referral**: Staff only; one per question (`project_referrals.questionId` unique). Duplicate or concurrent → 409 `ALREADY_REFERRED`, nothing written. Open discussion (`wantsMentor=false`) → 409 `MENTOR_NOT_REQUESTED`. Non-mentor target → 400. reason 1–300.
- **State**: `discussion` if !wantsMentor; `needs_referral` without referral; `awaiting_reply` if no mentor_reply yet or the latest follow_up is after the latest mentor_reply (database order: `createdAt` with microseconds, then id); else `replied`. Comments never change state. Project status changes do not close questions.
- **Workbench**: Staff gets `needsReferral` (wantsMentor, no referral) and `referred`; Mentor gets `awaitingReply` / `replied` for questions referred to them. The other role's arrays are empty. Student → 403, no header → 401. Questions and posts are ordered by `createdAt`, then id.
- Additive migration: new tables `project_relations`, `project_questions`, `project_posts`, `project_referrals` via `CREATE TABLE IF NOT EXISTS`; legacy lessons/comments/referrals/adoptions untouched. Fixtures add `question-events-shifts` (needs referral, on `project-events`) and `question-checkin-reuse` (open discussion, on `project-v2-finished`).
- Pages: `/projects/:id/pick-up`, project detail source line / “Picked up by” / Questions & guidance, `/workspace` as Staff or Mentor workbench. Workbench items link to `/projects/:id#q-:questionId`.

## Phase 1 project reflection contract

`Project.reflection` 是始终返回的 `ProjectReflection | null`：null 表示旧项目尚未填写新版总结。详情页可内联展示原 Lesson 为 Historical experience，不自动将其改写为新成果。

```ts
interface ProjectReflection {
  progress: string;
  outcomes: string[];
  problems: { title: string; assumed: string; happened: string; changed: string }[];
  nextTeam: string;
  whyPaused: string;
  ifAgain: string[];
  reusable: { label: string; url: string | null }[];
}
```

- GET 项目列表/详情返回 reflection；项目详情只返回 project / lessons，不再返回 adoptedLessons 或 downstreamAdoptions。
- POST `/api/projects` 省略 status 时默认 ongoing，可带部分 reflection；空总结使用空字符串/数组规范化。
- PATCH `/api/projects/:id` 接受部分基本资料及部分 reflection；先与已保存项目合并，再按最终状态验证，保存状态与内容。遗漏 reflection 字段保留；传入数组替换对应数组。
- Finished 至少一条非空成果及非空 nextTeam；Paused 必须 whyPaused 与至少一条 ifAgain；状态切换不擦除其他状态总结。旧 null 项目不在只读查询时被强制改写。
- reusable.url 可为 null；有链接时必须 HTTP(S)。客户端不得指定 ownerId，写入仍需 student 身份及所有者权限。
- 数据库使用 `ADD COLUMN IF NOT EXISTS reflection JSONB` 增量迁移；重复初始化保留所有旧表、数据及用户编辑。
- 第一轮未包含项目级问题、引荐、接棒端点；它们由上文 P1 relay endpoints 提供。

## Full v2 required changes — P1 portion implemented above, remainder pending

- 项目状态总结已纳入第一轮；项目讨论和接棒已由 P1 接通。
- 接棒提交 `reproduce|continue|improve`、新名称及目标，创建属于当前学生的 Ongoing 项目；读取返回来源与后续项目摘要。
- 问题归项目，平铺回复归具体问题；Staff 引荐指向问题，指定 Mentor 回复与完成状态保持原子一致。
- 状态与对应总结一起校验；历史内容、未解决问题、待回复引荐和接棒关系保留。
- Staff 工作台展示社区问题，Mentor 展示待办；关系数量不等于成功数量，v2 不要求旧采用统计。
- 项目问题与关系端点及旧讨论映射在下一轮集中确定。本轮只增量添加 reflection，不删除旧数据。

## Compatible existing endpoints

Canonical fields and TypeScript interfaces: `src/shared/types.ts`. JSON fields are camelCase; IDs are strings; dates are ISO timestamps. Nullable response fields are always present as `null`. Optional request fields may be omitted; URL fields may be null. Inputs never accept client-selected owner, role, author, or creation date.

## Identity and errors
Read requests are public. Mutations require `x-demo-user-id` matching a stored demo user. This is a development/demo mechanism, not authentication. Server-side role and ownership checks apply even when an action is hidden in the UI.

Success: `{ "data": value }`. Error: `{ "error": { "code": "...", "message": "..." } }`. Use 400 for invalid inputs, 401 for missing/invalid identity, 403 for forbidden role/ownership, 404 for missing records, 409 for conflicting operations, and 500/503 for internal/unavailable storage. Do not expose SQL, connection URLs, or stack traces to clients.

## Data shapes
- User: `id,name,role,headline,tags`.
- Project: `id,ownerId,title,summary,courseOrClub,term,tags,demoUrl,codeUrl,status,reflection,createdAt,updatedAt`.
- Lesson: `id,projectId,authorId,type,title,assumed,happened,change,conditions,artifacts,createdAt,updatedAt`. Artifact: `{label,url}`.
- Comment: `id,lessonId,authorId,body,parentId,kind,referralId,createdAt`; kind is `question|comment|reply`.
- Referral: `id,lessonId,questionCommentId,staffId,mentorId,reason,status,createdAt`; status is `pending|completed`.
- Enriched historical discussion comments include `author`; referrals include `mentor` and `staff`. Adoption records remain stored, but their application types, statistics and public response fields are retired.

## Endpoints
| Method and path | Input | `data` response |
|---|---|---|
| GET `/api/users` | — | `User[]` (filter role locally for mentors) |
| GET `/api/health` | — | `{status:'ok',databaseMode,demoIdentity:true}` after storage check |
| GET `/api/projects` | query `q`, `status` optional | `Project[]` |
| POST `/api/projects` | `ProjectInput` | created `Project` |
| GET `/api/projects/:id` | — | `{project,lessons,source,successors}` (P1 `RelayProjectDetail`) |
| PATCH `/api/projects/:id` | partial `ProjectInput` | updated `Project` |
| GET `/api/lessons` | query `q` optional | `Lesson[]` |
| POST `/api/projects/:id/lessons` | `LessonInput` | created `Lesson` |
| GET `/api/lessons/:id` | — | `{lesson,project}` |
| PATCH `/api/lessons/:id` | partial `LessonInput` | updated `Lesson` |
| GET `/api/lessons/:id/comments` | — | `{comments,referrals}` enriched as above |
| POST `/api/lessons/:id/comments` | `{body,kind,parentId?}` | created `Comment` |
| POST `/api/referrals` | `{questionCommentId,mentorId,reason}` | created `Referral` |
| POST `/api/referrals/:id/replies` | `{body}` | created `Comment` linked to referral and question |
| POST `/api/lessons/:id/adoptions` | retired | HTTP 410 `{error:{code,message}}`; no database writes |
| PATCH `/api/adoptions/:id` | retired | HTTP 410 `{error:{code,message}}`; no database writes |

`ProjectInput`: title, summary, courseOrClub, term, tags; optional status (default ongoing), demoUrl/codeUrl and partial reflection. PATCH uses partial ProjectInput. `LessonInput`: type, title, assumed, happened, change, conditions, artifacts.

## Checks
- Project writes require student ownership. Historical Lesson write endpoints retain ownership checks, but the product no longer offers a separate Lesson editor.
- A reply parent must belong to the same lesson. A referral must target a question and a mentor user; its lesson is derived from that question.
- Only Staff creates referrals; only the referred Mentor completes a referral. Reply and completion must save atomically. The returned comment links to its referral and original question.
- Adoption endpoints return 410 before parsing identity or accessing storage. No replacement project relationship is created. State changes never cascade-delete history.

## Demo identifiers
Users: `student-alex`, `student-mia`, `mentor-sarah`, `staff-kevin`.
Projects: `project-signup` (Alex, finished, legacy null reflection), `project-events` (Mia, ongoing, legacy null reflection), `project-v2-finished` and `project-v2-paused` (fictional reflection samples).
Lessons: `lesson-fields`, `lesson-confirmation`, `lesson-accessibility`, all from Campus Signup. Fixtures contain no fabricated initial comments, referrals, or adoptions; the current product exposes project reflections and non-mutating future-action placeholders.

### Retired UI and links
Independent `/lessons/:id` pages redirect to the source `/projects/:id`; missing lessons return 404. The product has no links into independent lesson pages, lesson forms/discussions, adoption controls or adoption counts. Inline Historical experience stays readable. Old Lesson/comment/referral APIs are retained for history compatibility only; project-level help remains a non-mutating placeholder.
