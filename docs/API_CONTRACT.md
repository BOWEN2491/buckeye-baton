# Buckeye Baton — API contract

> **版本边界（2026-10-24）：当前实现 v2 第一轮项目浏览与总结编辑，兼容旧 Lesson v1 接口。** 完整接棒、项目问题与引荐尚未实现；相关按钮只原地提示。第一轮验收见 PHASE1_ACCEPTANCE.md，完整目标见 MVP_SPEC.md / ACCEPTANCE.md。

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

- GET 项目列表/详情返回 reflection；原有详情数组保留兼容。
- POST `/api/projects` 省略 status 时默认 ongoing，可带部分 reflection；空总结使用空字符串/数组规范化。
- PATCH `/api/projects/:id` 接受部分基本资料及部分 reflection；先与已保存项目合并，再按最终状态验证，保存状态与内容。遗漏 reflection 字段保留；传入数组替换对应数组。
- Finished 至少一条非空成果及非空 nextTeam；Paused 必须 whyPaused 与至少一条 ifAgain；状态切换不擦除其他状态总结。旧 null 项目不在只读查询时被强制改写。
- reusable.url 可为 null；有链接时必须 HTTP(S)。客户端不得指定 ownerId，写入仍需 student 身份及所有者权限。
- 数据库使用 `ADD COLUMN IF NOT EXISTS reflection JSONB` 增量迁移；重复初始化保留所有旧表、数据及用户编辑。
- 本轮不新增项目级问题、引荐、接棒端点，前端占位按钮不发送写请求。

## Full v2 required changes — pending implementation

- 项目状态总结已纳入第一轮；后续仍需接通项目讨论和接棒。
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
- Adoption: `id,lessonId,adoptingProjectId,authorId,result,note,artifactUrl,createdAt,updatedAt`.
- Enriched discussion comments include `author`; referrals include `mentor` and `staff`; enriched adoptions include `project` and `author`.

## Endpoints
| Method and path | Input | `data` response |
|---|---|---|
| GET `/api/users` | — | `User[]` (filter role locally for mentors) |
| GET `/api/health` | — | `{status:'ok',databaseMode,demoIdentity:true}` after storage check |
| GET `/api/projects` | query `q`, `status` optional | `Project[]` |
| POST `/api/projects` | `ProjectInput` | created `Project` |
| GET `/api/projects/:id` | — | `{project,lessons,downstreamAdoptions,adoptedLessons}` |
| PATCH `/api/projects/:id` | partial `ProjectInput` | updated `Project` |
| GET `/api/lessons` | query `q` optional | `Lesson[]` |
| POST `/api/projects/:id/lessons` | `LessonInput` | created `Lesson` |
| GET `/api/lessons/:id` | — | `{lesson,project,adoptions,stats}` |
| PATCH `/api/lessons/:id` | partial `LessonInput` | updated `Lesson` |
| GET `/api/lessons/:id/comments` | — | `{comments,referrals}` enriched as above |
| POST `/api/lessons/:id/comments` | `{body,kind,parentId?}` | created `Comment` |
| POST `/api/referrals` | `{questionCommentId,mentorId,reason}` | created `Referral` |
| POST `/api/referrals/:id/replies` | `{body}` | created `Comment` linked to referral and question |
| POST `/api/lessons/:id/adoptions` | `{adoptingProjectId}` | created or existing `Adoption` |
| PATCH `/api/adoptions/:id` | `{result,note,artifactUrl?}` | updated `Adoption` |

`ProjectInput`: title, summary, courseOrClub, term, tags; optional status (default ongoing), demoUrl/codeUrl and partial reflection. PATCH uses partial ProjectInput. `LessonInput`: type, title, assumed, happened, change, conditions, artifacts. Stats: `{total,worked,partial,failed}`; total counts only non-null results.

## Checks
- Project and lesson writes require student ownership. Lesson editing is included to support correction after later feedback.
- A reply parent must belong to the same lesson. A referral must target a question and a mentor user; its lesson is derived from that question.
- Only Staff creates referrals; only the referred Mentor completes a referral. Reply and completion must save atomically. The returned comment links to its referral and original question.
- Adopting project must belong to the acting student and differ from the lesson's source project. One record per `(lessonId, adoptingProjectId)`; repeated adoption returns the same record.
- Adopted results are self-reported. A meaningful note is required; accepted links are HTTP(S). State changes never cascade-delete history.

## Demo identifiers
Users: `student-alex`, `student-mia`, `mentor-sarah`, `staff-kevin`.
Projects: `project-signup` (Alex, finished, legacy null reflection), `project-events` (Mia, ongoing, legacy null reflection), `project-v2-finished` and `project-v2-paused` (fictional reflection samples).
Lessons: `lesson-fields`, `lesson-confirmation`, `lesson-accessibility`, all from Campus Signup. Fixtures contain no initial comments, referrals, or adoptions so the journey can be demonstrated live.

### Adopted experiences on destination projects
`ProjectDetail.adoptedLessons` is a required array of `{ adoption: Adoption, lesson: Lesson, sourceProject: Project }`. It includes both saved entries (`adoption.result === null`) and reported outcomes. Use it to show the adopting project's borrowed lessons and links to their source projects. `downstreamAdoptions` remains reported outcomes on lessons belonging to this source project.
