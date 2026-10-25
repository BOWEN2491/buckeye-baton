# P4 实现报告（单 Agent 全栈）：统一 Inbox 与自动邀请

2026-10-24 · 分支 `codex/p4-implementation` · 基线 `origin/codex/p4-integration` @ `1c3ed64`（包含已验收应用 `38e4901` 和 P4 三份文档）· 契约 `docs/P4_CONTRACT.md`
最终提交 SHA 见 READY 短块（本报告随该提交一起推送）。本报告是实现方自测，**不等于总控验收通过**，不给总体进度计分。手动剧本见 [P4_MANUAL_ACCEPTANCE.md](P4_MANUAL_ACCEPTANCE.md)。

## 返修 R1–R3（依据 docs/P4_REVIEW.md，审查提交 7b8a629）

| 项 | 修复 | 正式回归（旧代码失败 → 修复后通过） |
|---|---|---|
| R1 Unread 与未读数语义不一致 | `listInbox`（src/server/inbox.ts）：Unread 先在 SQL 中排除已持久化的终态和已到期邀请，再在分页边界之前逐行计算有效状态（排除因资格失效而取消的邀请），按精确 `(createdAt,id)` 批量扫描，凑够 limit+1 后才决定 nextCursor。失效记录不会遮住后面的真正未读。All/Invitations 保留历史；GET 不写库；游标与权限不变 | `tests/p4-review.test.ts` R1：同微秒的两条 Activity、60 条失效邀请（超过一个扫描批次，包含 cancelled、已过期、Ongoing 项目上的 pending）、一条有效 pending，以 limit=2 翻页得到 `[a2, valid, a1, a0]`，每页 unreadCount=4；Invitations 历史仍可见；GET 前后表一致。**在 7b8a629 的 inbox.ts 上失败** |
| R2 Refresh 只合并首页 | `src/app/inbox/page.tsx` 改为加载窗口：Refresh 从头分页重新读取 max(20, 当前已加载条数)，然后同时替换列表和 Load more 游标。新消息把旧消息推出窗口时，Load more 从最后显示的一条继续，不漏不重；已读、失效和删除在整个已加载范围内同步；Mark as read / Accept / Ignore 通过同一事件刷新窗口；身份、筛选的迟到请求或旧刷新按 generation 丢弃；刷新失败时保留已加载内容，并明确提示 “Couldn’t refresh … Showing the messages loaded earlier.” | `tests/e2e/inbox.spec.ts` 三个独立用例：（a）全部加载后再来 25 条，Refresh 后可加载全部 n0+25 条；再来 3 条后 Load more 得到 n0+28 条，与 API 总数一致；（b）一条已在 25 条之后的评论被删除，Refresh 后显示 Comment removed、原文消失；（c）Unread 中 Mark as read 后条目减 1，计数一致。**用 7b8a629 的页面重新构建后三项都失败**（21/26 条、旧预览仍在、54≠53），修复后通过 |
| R3 初始化失败后 runner 永久停止 | `src/server/invitation-runner.ts`：`database()` 也纳入受控失败处理，循环在 `finally` 中安排下一次（除非已停止），不会出现未处理的 reject 或忙循环。库不可用时只输出安全日志并记住时间，恢复后先持久化 lastFailureAt/DISPATCH_FAILED，再派发并写 lastCompletedAt，同时清除错误；停止语义和不重叠保持不变；没有新增公开接口或可调时钟 | `tests/p4-review.test.ts` R3 两项：（a）数据库配置不可用并失败多轮，切换为可用临时库后自动成功，lastFailureAt ≤ lastCompletedAt、error=null，没有 unhandledRejection；（b）注入的检查前两次 reject 后仍按间隔继续（≥4 次，最多同时 1 次）；检查进行中停止后不再排程；随后再次 start 正常运行。**在 7b8a629 的 runner/invitations 上三项都失败**（未处理的 reject，0 次运行） |

## 返修 R2-follow-up（依据 docs/P4_RECHECK.md，复验提交 2ad5607）

- **问题**：Load more 进行中时，focus 或 30 秒自动刷新会递增 generation。旧分页响应被正确丢弃，但同时跳过了释放 busy（失败路径同样如此），按钮因此永久停在 disabled 的 “Loading…”，后面的条目无法访问。
- **修复**（只改 `src/app/inbox/page.tsx`）：Load more 有独立的请求 id（`moreRequest`），与列表 generation 分开管理。刷新或重置开始时让进行中的 Load more 失效，并立即释放其 busy；旧请求结束时既不写列表和游标，也不清除新请求的 busy；当前请求在 `finally` 中释放 busy，只有仍属当前列表时才显示错误。没有禁用 focus 或定时刷新，没有改动契约或依赖。
- **回归**（`tests/e2e/inbox.spec.ts`）：
  - 两个用例分别覆盖延迟的 Load more 最终成功和最终失败：在 focus 刷新完成后放行，并等待该响应真正结束。之后没有 “Loading…”，Load more 可用，没有错误提示；继续加载得到恰好 total 条且全部唯一。
  - 另一个用例在延迟的 Load more 期间切换到 Invitations 筛选，确认旧页被丢弃（保持既有的迟到响应隔离）。
  - **用 2ad5607 的页面重新构建后，两项交错用例都失败**（仍有 1 个 Loading…）；筛选隔离用例在新旧版本都通过（属于保持性检查）。R1/R3 回归和三个 R2 场景保持通过。

## Phase 0：可用 API 与关键缺口

- 复用：`Database.transaction` / `database()` 单例（db.ts）；共用 `threads()` 与 P3 的 `pendingEvent` / `exactKeys` / `noPickup` / `questionPriority`（等待轮次、精确时间与年龄分只有一处实现）；`actor` / `role` / `parse` / `json` / `fail`（http.ts）；`useResource` 的身份 key 与过期响应保护（client.ts）。schema 由 setup 按分号拆分执行，因此新表都是单句 DDL，没有使用 PL/pgSQL。
- 缺口与处理：
  - P3 时期 `askQuestion` / `addPost` / `refer` 不在事务中，已改为事务，业务写入和通知一起提交或回滚。
  - `refer` 的唯一冲突在事务内回滚后返回 409，因此不会产生通知。
  - `priority.ts` 的 pendingEvent 等原为私有函数，已导出供邀请复用，没有改动 P3 的公开 API 或排序。
  - Next 15 官方 `src/instrumentation.ts` 的 `register()` 在 Node 运行时动态导入 runner（依据 2026-10-24 查阅的官方 instrumentation 指南）。

## 交付项

- **增量表**（db/schema.sql，可重复执行）：
  - `inbox_items`：Activity 和 Invitation 共用。有 `UNIQUE("recipientId","eventKey")`；CHECK 约束 kind/event/状态组合，以及邀请必须有 cycleKey/expiresAt；外键指向 users/projects/questions/posts/referrals；索引覆盖收件人（createdAt desc, id desc）和邀请目标。
  - `inbox_preferences`。
  - `invitation_dispatch_state`：单行，既是锁，也保存 lastCompletedAt/lastFailureAt/error。
  - 不回填旧 Activity，不改动任何旧数据或 AI 版本。
- **Activity**（src/server/inbox.ts）：
  - 事件键为 `question:` / `post:` / `referral:` 加 ID，与业务写入同一事务。
  - 收件人按契约矩阵：新问题通知楼主；评论通知楼主和提问者；追问另加已引荐的 Mentor；正式回复另加引荐的 Staff；引荐通知提问者和被引荐 Mentor。按收件人去重并合并原因，排除操作者本人。
  - 不保存正文快照：预览在读取时生成（≤160 码点，不拆分代理对，纯文本）；已删除帖子显示 `removed:true`、`preview:null`。
- **Inbox API**：
  - 分页游标是最后一条 item.id，服务端用数据库精确 `(createdAt,id)` 比较；他人或未知游标返回 400。
  - `{read:true}` 幂等，他人返回 404。偏好 GET 不写库。unreadCount = 未读 Activity + 未读且仍然有效的 pending 邀请。
- **邀请**（src/server/invitations.ts）：
  - 两类目标与契约一致：pickup 要求发布 ≥14×24h；help 要求当前轮次等待 ≥3×24h。
  - 匹配：作者标签规范化（trim、小写、去重）；Student 的证据是本人拥有、有成果/进展/问题/建议或历史 Lesson 的 Finished 项目；Mentor 的证据是在他人项目上未删除的正式回复。
  - 排除：项目所有者、提问者、当前指定的 Mentor、Staff、已关闭邀请的人。排序：共同 tag 数、证据项目数、user.id。
  - 限额与去重：每收件人 24h 内 1 条、7 天内 3 条；每目标 24h 内 1 条、终身 3 条；同一收件人、类型和目标永久只发一次（唯一约束）；每次最多检查 100 个目标；目标按 P3 分数、精确等待时刻或项目 createdAt、类型、ID 排序。
  - 有效状态：7 天后过期；周期 key 为问题 ID 或首条未回答追问的 ID；GET 只计算不写库；派发器、应答、偏好变更和相关写操作（回复、删帖、接棒、项目 PATCH）在锁内持久化 expired/cancelled。
  - 接受或忽略：重复同一操作返回现状；相反操作或已失效返回 409；接受只记录意向，`actionable` 单独表示是否还能继续。
  - Interested helpers 只给 Staff，只返回当前轮次已接受的意向；Mentor 意向可一键预选进入原人工引荐表单。
- **锁顺序**：派发、应答、偏好变更、提问、发帖、引荐、删帖、接棒和项目 PATCH 都先锁 `invitation_dispatch_state` 单行，再处理目标或帖子行；所有资格判断、限额计算和创建都在同一锁内事务中，使用同一个数据库时间（测试只能注入内部时钟）。
- **Runner**（src/server/invitation-runner.ts + src/instrumentation.ts）：
  - 只有设置 `INVITATION_RUNNER_ENABLED=1`、运行时为 `NEXT_RUNTIME=nodejs`、且不在 `phase-production-build` 时才启动。
  - 启动后立即检查一次，此后在每次检查完成后 60 秒再检查，不会重叠。复用同一进程的 `database()`，没有额外进程或 worker。
  - 失败时回滚，记录 `DISPATCH_FAILED` 和 lastFailureAt，下一周期重试；成功时更新 lastCompletedAt 并清除错误。没有公开的派发端点。
- **页面**：
  - 导航新增 Inbox，显示当前身份的未读数：随身份切换重新加载，读取失败时不显示数字。
  - `/inbox`：All/Unread/Invitations 筛选、Activity/Invitation 标签、View question/View project（先保存已读再打开，不会自动接受邀请）、Mark as read、Accept/Ignore、Continue to pickup、Load more（合并刷新，不打乱已载入内容）、Refresh。
  - 自动刷新：获得焦点、页面可见时以及每 30 秒（页面不可见时跳过）。
  - 状态：空状态 “You're all caught up”，失败显示 Retry。
  - Settings：Automatic invitations 开关，说明 “Activity updates will still arrive.”。
  - Staff 额外看到 runner 状态卡（On/Off、最近成功检查时间、故障提示）。
  - 问题区 Staff 视图有 Interested helpers。原工作台、负载、P3 的 Suggestions/Detail 和按状态表单都保留。

## 命令与结果（Node v22.15.1，Windows，`NEXT_TELEMETRY_DISABLED=1`，在自己的克隆目录 `D:/Codes/Buckeye-baton` 运行）

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run test:backend` | **20/20** 通过（P4 四项，加 R1/R3 回归三项；原 13 项全部保留） |
| `npm run build` | 通过；另以 `INVITATION_RUNNER_ENABLED=1` 和指向新临时目录的 PGlite 构建，构建后该目录未被创建，也没有 runner 输出（构建期不派发） |
| `npm run test:e2e`（`E2E_PORT=3410`、mock 3509，生产 `next start`，独立临时 PGlite，runner 开启） | **23/23** 通过（含 R2 三项和 R2-follow-up 三项，在最终提交上重跑），含 390px |

### 后端证据（tests/p4.test.ts，隔离 PGlite，固定时钟只在内部注入）

- K1/K2：四身份矩阵逐步计数；楼主同时是提问者时合并为一条并保留两个原因；本人操作不通知；403/409 的拒绝写入不产生消息。
  - 原子性：通知表临时加上 `CHECK(false) NOT VALID` 后，评论和提问都返回 500，帖子和问题也没有写入。
  - 重复 setup/seed 和重启后消息数量不变。
- K3：未登录 401；改他人消息 404；他人或未知游标 400；非法 filter/limit/body 返回 400；三种 GET 前后 inbox_items 完全一致。已读幂等，未读数减 1。
  - 预览：200 个 emoji 截断为 ≤160 码点，以省略号结尾，没有孤立代理。
  - 删帖后三个相关身份的 Inbox JSON 都不含原文。
  - 同一微秒的 5 条消息以 limit=2 翻页，不漏不重且顺序正确。
  - 关闭邀请不影响 Activity。
- K5/K6/K7：
  - 发布刚好 14 天和差 1 秒；等待刚好 3 天和差 1 秒。
  - 大小写和空格不同的 tag 归一；空 tag 和不匹配不产生任何行；空壳 Finished 不算证据；Mentor 证据只认正式回复；排序为 2 个 tag 优先于 1 个，同等时按 id。
  - 目标 24h 窗口：差 1 秒不发、刚好 24h 发给下一位；永久去重；目标终身计数。
  - 收件人 1/24h 和 3/7 天：第 0、1、2 天各发 1 条，第 3、6 天不发，第 7 天刚好滑出后发。
  - 到期：GET 显示 expired 但数据库仍是 pending，应答后返回 409 并持久化 expired。
  - 关闭邀请会持久化 cancelled，重新开启不补发；接棒后接受过的邀请变为不可继续，但选择保留。
- K8：接受不创建关系或引荐；工作台、负载和正式回复权限不变；Staff 照常人工引荐；正式回复后意向列表清空；非 Staff 访问 403；未知问题 404。
- K9：register() 在 edge、未开启和构建阶段都不启动，只有 Node 且开启时启动；runner 循环最多同时运行一次检查，停止后不再执行。
  - 故障恢复：插入被阻断时检查失败、回滚、记录 DISPATCH_FAILED，lastCompletedAt 不变；解除后下一次检查成功、错误清除，并补发了失败时未能发出的邀请；重启和重复迁移后没有重复邀请。
  - 派发与回复同时提交：该轮最终没有 pending 邀请。说明：PGlite 是单连接、事务串行，这只证明顺序逻辑和约束，**不代表真实 pg 多连接通过**。

### 浏览器证据（tests/e2e/inbox.spec.ts 与全部旧回归）

1. **无页面自动派发**：第一个用例只用 Playwright 的 API request，不打开任何页面。生产服务器启动后已经有 lastCompletedAt；Mia 收到 Study Room Finder Pilot 的 pickup 邀请（证据为 Campus Map Kiosk），Sarah 收到 help 邀请（理由是 maps 项目上的正式回复），Alex 作为所有者没有收到。约 60 秒后 lastCompletedAt 自动更新，且没有重复邀请。
2. **Activity 四身份 UI 旅程**：Mia 提问 → Alex 导航显示未读、Inbox 显示消息，Mark as read 后刷新仍保持，Unread 筛选中消失 → Kevin 引荐（Mia 收到的预览为理由，Sarah 收到任务通知）→ Sarah 从 Inbox 的 View question 定位到原问题并回复（Alex、Mia、Kevin 各收到一条）→ Mia 感谢（Sarah 不收到）→ 追问（Sarah 收到）→ 再回复（Kevin 新增一条）→ Alex 删除回复后各 Inbox 显示 “Comment removed”，不含原文。改他人消息返回 404；390px 无溢出。
3. **邀请 UI**：Mia 接受后提示 “Nothing was created or assigned”，后续项目数量不变，Continue to pickup 进入原表单；再忽略返回 409。设置关闭后刷新仍保持，再开启。Sarah 接受后，Kevin 在问题处看到 Interested helpers，问题仍待引荐，Refer mentor 打开原表单并预选 Sarah；非 Staff 访问 403。Staff 看到 runner 状态卡和空 Invitations；加载失败显示 Retry 并能恢复；切换身份后不残留上一身份的数据；390px 无溢出。
4. **旧回归 14 项**：P0 五项、评论删除一项、P1 两项、P3 三项（年龄分、Suggestions/Detail、微秒顺序、接棒）、P2 三项（mock 简介确认和过时回退、负载、R3 多表单刷新）全部通过。

截图存放在本机临时目录 `C:/Users/23678/AppData/Local/Temp/claude/D--Codes-Buckeye-baton/0ed38a91-4ca2-4b43-9f37-f40b93bd7c18/scratchpad/qa-p4/`，未提交：inbox-owner-desktop、inbox-invitation-desktop、interested-helpers-desktop、inbox-mobile，以及沿用的 P0–P3 截图。

### 生产 runner 补充证据（无浏览器，curl 只调用不派发的 GET）

脚本 `p4-runner-proof.sh`（存放在本机临时目录，未提交）在端口 3420 上用 `next start` 启动生产服务器，使用新的临时 PGlite，并先写入相同的虚构 fixture。全程不打开浏览器，只用 curl 调用 status/inbox 等只读接口。

| 运行 | 结果 |
|---|---|
| 1. 开启 runner，冷启动 | 启动约 7 秒后 `enabled:true`、`lastCompletedAt=03:29:49.131Z`，日志为 `check completed … 2 created`；Mia 收到 pickup（p3-old-paused），Sarah 收到 help（p3-old-question），状态都是 pending |
| 1. 约 60 秒后 | `lastCompletedAt=03:30:49.300Z`（间隔 60.17 秒），`0 created`，Mia 仍只有 1 条邀请 |
| 2. 停止后用同一库重启 | 启动后立即检查，`lastCompletedAt=03:31:07.011Z`，`0 created`；Mia 和 Sarah 的邀请保持原有一条，没有重复 |
| 3. 新库，不开启 runner，等待 70 秒 | `enabled:false`、`lastCompletedAt:null`，Mia 没有邀请 |

日志只有安全摘要（时间和创建数量），没有正文或秘密。临时库在脚本结束后删除。

## 模型与环境

- 真实模型调用 **0 次**；P2 回归使用既有本地 mock。没有读取或复制任何 `.env`/key。
- 只使用自己的克隆目录和构建目录，端口 3410/3509（e2e）和 3420（runner 证据），数据库都是新的临时 PGlite。没有触碰总控目录、3000/P3 服务、`buckeye-baton-p3-detail`、`buckeye-baton-p3-review` 或旧 P1/P2 数据；没有改 main，没有合并 PR #3，没有部署。

## Not run、限制与风险

- 真实 PostgreSQL 多连接、Neon、AWS、公网、多实例：Not run。并发测试只在单连接 PGlite 上证明串行逻辑和约束。
- 云端或 serverless 定时调度：Not run；runner 只适用于持续运行的 Node 进程，进程停止时不会派发。
- 锁粒度：所有影响资格的写操作都与派发串行，这是契约接受的演示规模取舍。
- 用户 3000 预览没有启用 runner，也没有测试证据数据；手动验收请按剧本使用独立临时库。
- Activity 的 `href` 定位到问题锚点 `#q-<id>`（帖子没有独立锚点）。
