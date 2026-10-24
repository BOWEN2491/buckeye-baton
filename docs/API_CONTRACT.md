# Buckeye Baton — API contract

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
