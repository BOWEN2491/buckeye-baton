# Buckeye Baton — API contract

Canonical fields and TypeScript interfaces: `src/shared/types.ts`. JSON fields are camelCase; IDs are strings; dates are ISO timestamps. Nullable response fields are always present as `null`. Optional request fields may be omitted; URL fields may be null. Inputs never accept client-selected owner, role, author, or creation date.

## Identity and errors
Read requests are public. Mutations require `x-demo-user-id` matching a stored demo user. This is a development/demo mechanism, not authentication. Server-side role and ownership checks apply even when an action is hidden in the UI.

Success: `{ "data": value }`. Error: `{ "error": { "code": "...", "message": "..." } }`. Use 400 for invalid inputs, 401 for missing/invalid identity, 403 for forbidden role/ownership, 404 for missing records, 409 for conflicting operations, and 500/503 for internal/unavailable storage. Do not expose SQL, connection URLs, or stack traces to clients.

## Data shapes
- User: `id,name,role,headline,tags`.
- Project: `id,ownerId,title,summary,courseOrClub,term,tags,demoUrl,codeUrl,status,createdAt,updatedAt`.
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
| GET `/api/projects/:id` | — | `{project,lessons,downstreamAdoptions}` |
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

`ProjectInput`: title, summary, courseOrClub, term, tags, status; optional demoUrl/codeUrl. `LessonInput`: type, title, assumed, happened, change, conditions, artifacts. Stats: `{total,worked,partial,failed}`; total counts only non-null results.

## Checks
- Project and lesson writes require student ownership. Lesson editing is included to support correction after later feedback.
- A reply parent must belong to the same lesson. A referral must target a question and a mentor user; its lesson is derived from that question.
- Only Staff creates referrals; only the referred Mentor completes a referral. Reply and completion must save atomically. The returned comment links to its referral and original question.
- Adopting project must belong to the acting student and differ from the lesson's source project. One record per `(lessonId, adoptingProjectId)`; repeated adoption returns the same record.
- Adopted results are self-reported. A meaningful note is required; accepted links are HTTP(S). State changes never cascade-delete history.

## Demo identifiers
Users: `student-alex`, `student-mia`, `mentor-sarah`, `staff-kevin`.
Projects: `project-signup` (Alex, finished), `project-events` (Mia, ongoing).
Lessons: `lesson-fields`, `lesson-confirmation`, `lesson-accessibility`, all from Campus Signup. Fixtures contain no initial comments, referrals, or adoptions so the journey can be demonstrated live.

### Adopted experiences on destination projects
`ProjectDetail.adoptedLessons` is a required array of `{ adoption: Adoption, lesson: Lesson, sourceProject: Project }`. It includes both saved entries (`adoption.result === null`) and reported outcomes. Use it to show the adopting project's borrowed lessons and links to their source projects. `downstreamAdoptions` remains reported outcomes on lessons belonging to this source project.
