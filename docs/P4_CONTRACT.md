> Current product override (2026-10-25): see [P4_PRODUCT_REVISION.md](P4_PRODUCT_REVISION.md). Automatic invitations are pickup-only. Removed-post notifications are hidden from recipients other than the remover.

# P4 冻结契约：统一 Inbox 与自动站内邀请

实现状态更新（2026-10-25）：372646c已按本契约独立技术验收10/10，详见[P4_ACCEPTANCE.md](P4_ACCEPTANCE.md)，实际接口见API_CONTRACT。以下正文保留冻结时的规格；用户产品验收/main合并另行进行。

2026-10-24。**这是待实施契约，不是已上线接口。** 用户已通过 P3 产品验收，并补充所有角色的消息 Inbox。P4 使用一个全栈 Agent；实施清单见 [P4_AGENT_TASK.md](P4_AGENT_TASK.md)。本文覆盖旧蓝图中仅有邀请 Inbox 的范围，保留 P0–P3 全部已验收行为。

## 1. 范围与边界

所有角色共用 `/inbox`：**Activity** 告诉用户发生了什么；**Invitations** 让用户接受或忽略自动邀请。My workspace 继续表示当前待办，不搬走 Staff/Mentor 原队列。第一版没有私聊、邮件、浏览器推送、WebSocket、AI 匹配、真实认证或云端调度部署。

- UI、按钮、空状态和错误提示全部英文；Mentor 负载仍叫 **Awaiting reply**。
- 不恢复 deadline：等待年龄沿用 P3_PRODUCT_REVISION，legacy dueAt 不影响邀请、排序或通知。
- 自动邀请不是自动引荐。只有 Staff 能指定 Mentor；接受邀请不是接棒完成、正式导师回复、问题解决或能力认证。
- 活动通知从 P4 安装后的真实写操作产生，**不回填历史、不补发启动前旧讨论通知**。自动邀请可检查安装前仍符合条件的项目和问题，但遵守同一限额。

## 2. Activity 收件人矩阵

一次事件按收件人 ID 做集合去重，再排除事件操作者。一个人同时是楼主与提问者仍只有一条消息，保存多个收件原因用于解释。不向所有同角色用户广播。

| 已成功提交的事件 | 通知谁 | 英文示例 |
|---|---|---|
| 新项目问题，包括普通讨论 | 项目所有者 | `Mia asked a question on your project` |
| 新普通评论 | 项目所有者、该问题作者 | `Alex commented on “…”` |
| 新明确 follow_up | 项目所有者、该问题作者、已有引荐指定的 Mentor | `Mia asked a follow-up` |
| 新正式 mentor_reply | 项目所有者、该问题作者、该次引荐的 Staff | `Sarah replied to the question you referred` |
| Staff 成功引荐 Mentor | 问题作者、被引荐的 Mentor | `Kevin referred Sarah to your question` / `You were referred to a question` |

- Student 楼主可以看到谁在什么问题回复了什么；提问者可以看到引荐人与导师、引荐理由和回复。Mentor 收到最初引荐和后续明确追问；执行引荐的 Staff 收到每次正式导师回复。
- 回复正文只展示当前未删除文本的最多 160 个 Unicode 字符预览；引荐理由也用同一上限。不得半截 surrogate、输出 HTML 或复制秘密。打开消息跳到原项目的具体问题，帖子能定位时再定位帖子。
- 删除帖子不新发通知、不让旧通知引用已删除正文。既有消息可保留时间与事件，改为 `Comment removed`，预览为空，仍可打开原讨论。不能在通知快照、API、搜索或标题中泄露已删除原文。
- 发问题、评论、引荐与对应通知在**同一个数据库事务**中提交或回滚；通知插入失败不能出现业务写成功但消息永久丢失。拒绝的写入、重复引荐 409 和幂等重试不额外发消息。新建的不同帖子各是一件真实事件，不把相同文本当同一事件。
- Activity 不受自动邀请开关或邀请限频影响；阅读不改变问题状态、原工作台或 Awaiting reply。

## 3. Inbox 产品交互

- 导航增加 **Inbox** 和本人未读数，四身份均可进入。页内筛选 **All / Unread / Invitations**，默认 All，最新消息在前；Activity / Invitation 用文字标签区分。
- 每条消息有项目/问题、发起者或 `Buckeye Baton`、时间、可理解的内容及 **View question / View project**。真实无消息显示 `You're all caught up`，请求失败显示 Retry，不能显示假 0 或假消息。
- 单条 **Mark as read** 和打开消息显式请求保存 readAt；列表 GET 不自动标已读。接受或忽略邀请同时标已读。第一版不做批量标记、删除消息、私信或消息编辑。
- 邀请显示匹配原因、有效状态及 **Accept / Ignore**。阅读和接受是两件事；点击消息不得偷偷接受。
- 当前已读/未读和邀请处理结果刷新、重启后仍在。分页默认 20、最大 50，提供 **Load more**；新消息不打乱已经载入的旧页或重复追加。
- 顶栏与 Inbox 在当前身份下首次加载、窗口重新获得焦点、可见时每 30 秒重新读取；手动 **Refresh** 可立即读取。页面不可见停止轮询，组件卸载取消，身份切换清空旧消息/计数/请求结果。不能让上一身份的延迟响应闪回。
- 设置只包含 **Automatic invitations** 开关与解释：`Activity updates will still arrive.` 默认开启；关闭后不再创建邀请，未处理邀请取消，已接受/忽略历史保留。重新开启不重置限额或重复发送旧对象。
- Staff Inbox 可读显示自动派发 `On / Off`、上次成功检查时间和故障提示；不要把“没有匹配”当故障，也不把服务停机说成实时在线。

## 4. 自动邀请资格与解释

### 4.1 两类目标

| 类型 | 目标资格 | 候选人 | 接受后的动作 |
|---|---|---|---|
| `pickup` | 当前 Paused、没有任何后续接棒关系，项目发布已满 14 × 24 小时 | 有相关公开项目经验的 Student | 显示 `Continue to pickup`，进入现有接棒流程；仍需本人填写提交，绝不自动创建项目 |
| `help` | 共用 threads 状态为 needs_referral / awaiting_reply，当前未回答求助已等待满 3 × 24 小时 | 有相关公开经验的 Student 或 Mentor | `View question`；可公开提供普通评论。尚未被引荐的 Mentor 仍需 Staff 引荐才能发正式 mentor_reply |

等待起点复用现有 pending event：无正式回复从 question.createdAt，有回复后从第一条未回答 follow_up.createdAt。普通评论/感谢不重开，连续追问不归零，删除按有效帖子重算。Finished 项目仍可能有未回答问题；项目状态不自动关闭问题。

### 4.2 可解释匹配，不造成功率

1. 使用目标项目**作者填写的 tags**，trim、忽略大小写并去重；不使用 AI 草稿/确认标签、正文关键字猜测或新模型。
2. Student 的证据：本人拥有的 Finished 项目，至少有一项非空 outcomes/progress/problems/nextTeam 或保留的历史 Lesson；该证据项目与目标有共同 tag。Paused/Ongoing 和空壳 Finished 不计作本轮资格。
3. Mentor 的证据：在别人的项目中有未删除的正式 mentor_reply，且该历史项目与目标有共同 tag。普通评论、被引荐但未回复和收到邀请都不算。
4. 匹配候选必须开启邀请；排除目标项目所有者、问题作者、当前指定 Mentor 和 Staff。pickup 只选 Student。没有符合者就不发；四个演示身份保持不变，不能给 Sarah 伪造历史。
5. 排序：共同 tag 数降序、不同证据项目数降序、user.id 升序。只数项目，不数评论条数；不能用 Awaiting reply 当能力或可用时间。
6. 原因示例：`You shared a finished project about web. This project uses web too.` / `You previously replied as a mentor on an accessibility project.` 保留相关项目链接；只说分享/回复过，不说“已解决 N 个问题”“专家认证”或“很可能无解”。

### 4.3 限额与永久去重

所有时间按服务端同次检查时刻，滑动窗口，不按本地日历日。下列限额同时满足才可创建：

- 每收件人任意连续 24 小时最多 **1** 条自动邀请，连续 7 天最多 **3** 条。
- 每目标（pickup 项目或 help 问题）连续 24 小时最多 **1** 条，整个生命周期最多 **3** 条。
- 同一收件人 + 同一类型 + 同一目标，**整个生命周期只发一次**，所有状态都计入，不因忽略、到期、读完、删回复、重新开启或新追问重发给同一个人。第一版接受这一保守取舍。
- 历史创建记录都计频率，不因取消/过期而返还配额。无候选、受限跳过不创建 Inbox 记录，不占配额。
- 目标按现有 P3 分数高者先、同分共用精确等待时刻/项目 createdAt、再类型和 ID 稳定排序；每次最多检查 100 个尚未耗尽目标额度的目标。不得另写期限优先分或改动 P3 返回顺序。

## 5. 邀请状态与过期

`pending → accepted | ignored | expired | cancelled`。创建后 7 × 24 小时过期；重复相同处理返回现状，不重计数、不重复创建；相反操作或失效对象返回 409 `INVITATION_UNAVAILABLE`。收件人以外访问单项返回 404。

- 接受时在事务内重新检查：目标还存在、当前资格/同一等待轮次仍成立、本人偏好仍开启、尚未到期。邀请中内部保存 pending event 的稳定身份（question.id / 首条未回答 follow_up.id），不能用毫秒 ISO 当周期身份。
- 新正式回复结束该轮求助、该轮起点被删除、项目不再 Paused、有新后续接棒、关闭邀请等，未处理邀请立即**视为** cancelled；到期视为 expired。GET 只计算有效状态，不写数据库；派发器和相关写操作再持久化终态。旧问题以后再次追问不复活旧邀请。
- 接受只记录意向。help 接受后的本人可见提示说明普通讨论与正式引荐区别；Staff 在原问题处可看到当前仍有效的 **Interested helpers**，Mentor 有 **Refer mentor** 入口沿用现有人工表单/理由。已有引荐不允许再引荐；Student 意向不能显示成导师候选。
- 只有该问题当前有效、已接受 help 邀请的意向可展示给 Staff。新的等待轮次不沿用旧意向。接受不改变工作台分组、P3 状态或 Mentor 负载；后续真实发帖/接棒才按原规则变化。
- 已接受/忽略的历史保留，目标变化后不改写为另一种用户选择。响应里单独用 `actionable` 表示是否还能继续到当前帮助/接棒入口。

## 6. 共用类型（新增 src/shared/p4-types.ts）

沿用 User、QuestionThread、Project、统一 Success/Failure。公共日期仍为 ISO UTC；排序/周期精度保持内部，不改旧类型。

```ts
type InboxFilter = 'all' | 'unread' | 'invitations';
type ActivityEvent = 'question_created' | 'post_created' | 'referral_created';
type RecipientReason = 'project_owner' | 'question_author' | 'assigned_mentor' | 'referring_staff';
type InvitationKind = 'pickup' | 'help';
type InvitationStatus = 'pending' | 'accepted' | 'ignored' | 'expired' | 'cancelled';
interface InboxBase {
  id: string; createdAt: string; readAt: string | null;
  projectId: string; projectTitle: string; questionId: string | null;
  href: string; // server-built internal /projects/... path and valid anchor only
}
interface ActivityItem extends InboxBase {
  kind: 'activity'; event: ActivityEvent; actor: User;
  reasons: RecipientReason[]; postKind: 'comment' | 'follow_up' | 'mentor_reply' | null;
  questionTitle: string | null; preview: string | null; removed: boolean;
}
interface MatchEvidence {
  projectId: string; projectTitle: string;
  kind: 'shared_experience' | 'mentor_reply';
}
interface InvitationItem extends InboxBase {
  kind: 'invitation'; invitationKind: InvitationKind; status: InvitationStatus;
  expiresAt: string; respondedAt: string | null; actionable: boolean;
  matchedTags: string[]; evidence: MatchEvidence[]; reason: string;
}
type InboxItem = ActivityItem | InvitationItem;
interface InboxPage { items: InboxItem[]; nextCursor: string | null; unreadCount: number; asOf: string }
interface InboxPreferences { automaticInvitations: boolean }
interface InterestedHelper { invitationId: string; user: User; acceptedAt: string; matchedTags: string[]; evidence: MatchEvidence[] }
interface InvitationRunnerStatus {
  enabled: boolean; intervalSeconds: 60; lastCompletedAt: string | null;
  lastFailureAt: string | null; error: 'DISPATCH_FAILED' | null;
}
```

unreadCount = 本人的未读 Activity + 有效 pending 且未读的邀请，不是 pending 任务数。计算不依赖当前筛选或分页；过期/取消不显示为未处理邀请。Invitation 的系统文案由 UI 生成，不假装真人发送。证据只公开正常可读的项目资料，不向 API 暴露其他人的偏好、内部周期键或原始 SQL 错误。

## 7. API 边界（全部新接口均需演示身份）

| Method / path | 输入与成功返回 | 权限 |
|---|---|---|
| GET `/api/inbox?filter=all&limit=20&cursor=` | 200 InboxPage；cursor 是最后一条 item.id，服务器读取其精确排序值；未知/他人 cursor 400 INVALID_INPUT | 仅本人 |
| PATCH `/api/inbox/:id` | 严格 `{read:true}` → 200 InboxItem；幂等，不支持客户端改内容/收件人 | 仅收件人 |
| GET `/api/inbox/preferences` | 200 InboxPreferences，无记录返回默认值但不写表 | 仅本人 |
| PATCH `/api/inbox/preferences` | 严格 `{automaticInvitations:boolean}` → 200 InboxPreferences | 仅本人 |
| POST `/api/invitations/:id/respond` | 严格 `{action:'accept'|'ignore'}` → 200 InvitationItem | 仅邀请收件人 |
| GET `/api/project-questions/:id/interested-helpers` | 200 InterestedHelper[]，仅该问题当前有效意向 | Staff，其他角色403 |
| GET `/api/invitations/status` | 200 InvitationRunnerStatus | Staff，其他角色403 |

成功仍 `{data:...}`，失败仍 `{error:{code,message}}`。未登录401、非法输入400、他人单项404、失效/冲突409、失败500；英文错误。分页使用数据库精确 createdAt desc、id desc；不可先转换成 JS 毫秒再取游标边界。严禁任意客户端 userId/recipientId、公开派发/造通知端点或把 GET 当执行邀请按钮。旧 API 响应形状兼容，不给公共项目列表附上私人 Inbox。

## 8. 增量持久化、事务与竞争

使用新增表 `inbox_items`、`inbox_preferences`、`invitation_dispatch_state`；Activity 与 Invitation 共用 Inbox 存储与游标。内部列可按 SQL 风格实现，但至少保留接收人、事件/目标身份、类型、时间、readAt、邀请状态与周期、匹配证据 ID。增加 CHECK、FK 和必要索引，**唯一约束实现 (recipientId,eventKey)**，邀请 eventKey 固定由类型+目标 ID 构成；不能只靠 JS Set。

- Activity eventKey 用 `question:<id>` / `post:<id>` / `referral:<id>`，不含正文、当前时间或随机后缀。一个事务内集合去重后插入；ON CONFLICT 只用于同一个业务事件的重复通知。
- 不复制帖子 body 到通知持久快照；读取时关联未删除记录生成预览。旧数据、日期、项目关系、AI版本与所有正文不变；迁移重复运行不清空/回填消息。
- `invitation_dispatch_state` 固定一行既保存上次完成/失败时间，也作为 **数据库事务行锁**。派发、邀请应答/偏好变更，以及会改变目标资格的项目 PATCH/接棒/帖子写删/引荐，采用统一的锁顺序：先该行，再目标行/帖子行。复用现有 Database.transaction，不用进程内锁充当正确性保证。
- 全部资格/限额读、唯一约束和创建在锁内同次事务完成；使用锁取得后的数据库时间作本次 now。回复/接棒若先提交，派发不得再创建有效旧邀请；派发若先提交，后续回复/接棒可使其取消。不得读出候选后在事务外直接发送。
- 锁粒度接受小型演示的串行派发/相关写操作成本；事务中没有网络、AI或长时间等待。若当前 PGlite/Next 打包不支持实际模式，给出复现并报告 BLOCKED，不换成仅内存计数后声称多实例安全。
- 生产查询用数据库时间。测试可在仅内部服务函数注入统一 clock 或测试 Sql 适配，禁止公开 API/环境提供任意用户可改的当前时间。所有持久限额在数据库中计算，同一事务使用同一个时间点。

## 9. 真正自动的派发入口

首版面向**持续运行的 Node 进程**。用 Next15 支持的 `src/instrumentation.ts` 的 register，Node runtime 内动态导入服务端 runner；`INVITATION_RUNNER_ENABLED=1` 显式启用，默认关闭。成功启动后自动检查一次，再每 60 秒检查，完成后再安排下一次，不能重叠。App 停机不派发，重启按当前资格补查，限额来自持久记录。

- 构建、导入业务模块、GET、浏览器轮询都不派发；build 环境明确关闭 runner。Node/Edge 分支与构建保护必须实际验证，不能只凭文件名推测。既有 P2 回归仍使用 mock，P4 真实模型调用 **0**。
- 同进程复用 `database()` 全局单例。PGlite 只能一个进程持有目录；严禁另开 worker/CLI 连接活跃 App 的库。全局 timer 标记仅防本实例重复启动，不能代替持久去重/锁。
- 失败 rollback，无忙循环；记录安全故障摘要及 lastFailureAt，下个 60 秒周期再试；成功更新 lastCompletedAt 并清错误。进程启动、停止、失败恢复与状态接口都要有证据。
- 不新增外部服务、scheduler 依赖或收费资源；不把 Node timer 描述成 AWS/Amplify/serverless 上已验证的定时服务。未来云端运行方式另行验证，本轮只报告实际环境。

## 10. 必须覆盖的边界

通知矩阵各角色、双重身份去重、自发不通知、无效写无通知、事务 rollback；帖子删除预览清除；越权 Inbox/游标/设置/应答；已读持久与不同身份慢响应隔离；同毫秒分页不漏不重。

邀请 14天/3天/7天和24小时/7天滑窗的刚好边界；空/大小写 tags、空经验、删除 Mentor 历史、无候选、排除自我/已分配导师；每人和每目标限额同时约束；永久去重包括新追问；双派发与派发/回复/接棒/关闭开关竞争；过期或周期失效后409；接受不自动引荐/建项目/改变负载；Staff 可看意向但其他人不可；旧数据迁移重跑。

必须证明生产服务器**没有打开页面、没有调用 GET 派发端点**时，runner 已创建消息；并证明关闭 runner 不产生邀请、故障下次恢复及重启不重复。单连接 PGlite 的并发测试只证明串行逻辑/约束，不冒称真实 pg 多连接通过。

## 11. Phase 0 可用 API 与来源

实施前实际读取这些模式，不从旧任务书拷回 deadline 规则：

- `src/server/db.ts:6–36`：Sql.query、Database.transaction、database 单例与 setup；schema 按分号切句，不添加含内部分号的 DO/PLpgSQL。
- `src/server/relay.ts:56–126`：threadState 与 threads(sql,where,params)、askQuestion/addPost/refer；目前这三写操作尚需为通知改成事务模式；参照同文件 pickup/deletePost 的事务与唯一冲突。
- `src/server/priority.ts:18–60`：内部精确时间、pending event 和等待分；可提取共用内部函数，但不另造状态机/改公共 API。
- `src/server/http.ts`：actor/role/parse/json/fail；`src/server/api.ts` actor 之后才处理私人 GET。
- `src/lib/client.ts:36–60`：useResource 身份 key/过期响应保护；`src/components/app-shell.tsx:68–150`：导航与切身份回首页；`src/components/project-questions.tsx`：定位/引荐表单；`src/components/mentor-workload.tsx`：同页失效刷新参考。
- `tests/backend.test.ts` 模块入口，`tests/p3.test.ts` 临时库 SQL/API 与微秒回归；`tests/post-deletion.test.ts` 删除权限；`playwright.config.ts` 生产 start/临时SQL/mock 和 `tests/e2e/p3-fixtures.ts` 仅测试老数据模式。
- 官方 [Next.js 15 instrumentation](https://nextjs.org/docs/15/app/guides/instrumentation)：register、src 放置、Node 条件动态导入。该文档只证明启动钩子，不保证持续运行或云端调度，本契约的持续 Node 限制属于实施选择。

静态事实发现已核对；P4 schema、runner、锁竞争与通知页面尚未实现/验证。实现完成前不得把本文当 P4 API 已交付记录。
