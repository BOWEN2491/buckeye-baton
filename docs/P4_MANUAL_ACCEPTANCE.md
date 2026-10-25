# Current acceptance addendum — 2026-10-25

本次产品修订以 [P4_PRODUCT_REVISION.md](P4_PRODUCT_REVISION.md) 为准，下方原始剧本中的 help 邀请、Interested helpers 和“所有人看到 Comment removed”已退役，不再执行。

1. Mia → Inbox → Invitations：仅出现接棒邀请；Accept 只表示兴趣，Continue to pickup 仍需正常创建。已接受/忽略/已有接棒的历史状态按真实记录保留。
2. Sarah → Inbox → Invitations：不出现老问题求助邀请；正常引荐、回复和追问仍在 Activity。
3. Kevin → 项目问题：仍可 Refer a mentor；没有 Interested helpers 区块。
4. 创建评论后由作者删除：原接收者刷新 Inbox，该通知消失，未读数同步减少；没有新删除通知。
5. 由项目所有者删除别人评论：其他接收者通知消失；删除者原先收到的那条可保留 Comment removed，无正文。
6. 检查 All / Unread / Invitations、Load more、Refresh 和手机390px；历史项目、讨论、AI草稿保持。

当前预览地址与运行SHA见 [P4_PREVIEW.md](P4_PREVIEW.md)。下方保留原始交付剧本供追溯，冲突时不适用。

---

# P4 手动验收剧本：统一 Inbox 与自动邀请

**2026-10-25已准备好独立预览：http://127.0.0.1:3001，实际应用372646c。** 请直接从第1节开始，不需重复第0节建库/启动；Mia与Sarah的初始邀请已生成。当前PID/数据库与保护规则见[P4_PREVIEW.md](P4_PREVIEW.md)。原3000/P3不变。

2026-10-24 · 对应 `codex/p4-implementation`（精确 SHA 见 P4_REPORT/READY）。本剧本供总控复验和之后的用户产品验收使用；**不替换 3000 预览**，请使用独立目录、空闲端口和新的临时 PGlite。产品文案均为英文。真实模型调用 0 次。

## 0. 准备（独立预览，含仅测试用的虚构经验数据）

在自己的 checkout 中（Node 22），选一个空闲端口（下面以 3430 为例，使用前先检查 `netstat -ano | findstr :3430`）：

```powershell
$env:NEXT_TELEMETRY_DISABLED='1'; npm ci; npm run build
$db = "$env:TEMP\buckeye-baton-p4-manual-e2e-$(Get-Random)"   # 路径须含 e2e，fixture 脚本只接受临时库
$env:DATABASE_MODE='pglite'; $env:PGLITE_DATA_DIR=$db
npx tsx tests/e2e/p3-fixtures.ts                               # 只写入这个临时库
$env:INVITATION_RUNNER_ENABLED='1'; npx next start -p 3430
```

fixture 会加入：Alex 40 天前分享、无人接棒的 Paused 项目 “Study Room Finder Pilot”（tags maps/web）；Mia 提出的已等待 10 天的问题；Mia 的 Finished 项目 “Campus Map Kiosk”（maps），以及 Sarah 在该项目上的一次正式导师回复。这些都是虚构数据，只存在于临时库，常规 seed 和用户库不变。

**先不要打开浏览器。** 等约 10 秒后，用 Staff 身份调用状态接口（只读 GET，不会触发派发）：

```powershell
curl.exe -s -H "x-demo-user-id: staff-kevin" http://127.0.0.1:3430/api/invitations/status
```

预期：`enabled:true`、`intervalSeconds:60`、`lastCompletedAt` 已有时间、`error:null`。服务器日志中有 `[invitations] check completed`。约 60 秒后再查一次，`lastCompletedAt` 会更新。

## 1. Activity 旅程（四身份）

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 以 Mia 身份打开 Campus Signup，点 Ask a question，选择需要导师并发布 | Mia 的 Inbox 没有自己触发的消息 |
| 2 | 切到 Alex | 导航 Inbox 旁显示未读数；Inbox 中有 “Mia Johnson asked a question on your project”，标签 Activity/Unread |
| 3 | Alex 点 Mark as read，然后刷新 | Unread 消失且刷新后保持；Unread 筛选里不再出现这条 |
| 4 | 切到 Kevin，在该问题上 Refer a mentor 给 Sarah 并填写理由 | Mia 收到 “Kevin Brooks referred a mentor to your question”，预览为理由；Sarah 收到 “You were referred to a question”；Kevin 自己没有 |
| 5 | Sarah 在 Inbox 点 View question，正式回复 | 打开原项目的对应问题，消息变为已读；Alex 和 Mia 收到 Sarah 的回复，Kevin 收到 “Sarah Patel replied to the question you referred” |
| 6 | Mia 发普通感谢 | 只有 Alex 收到评论消息；Sarah 不收到 |
| 7 | Mia 明确追问（Post follow-up） | Alex 和 Sarah 收到 “Mia Johnson asked a follow-up”；Kevin 工作台中 Sarah 的 Awaiting reply 加 1 |
| 8 | Sarah 再次正式回复 | Kevin 再收到一条新消息 |
| 9 | Alex（楼主）删除 Sarah 的第一条回复 | 相关 Inbox 中该条显示 “Comment removed”，没有正文预览，仍可打开原讨论；队列按剩余帖子重新计算 |
| 10 | Mia 在 Alex 自己提的问题下评论 | Alex 只收到一条消息（楼主和提问者两个原因合并） |

其他检查：All / Unread / Invitations 筛选；消息较多时出现 Load more 且不重复；Refresh；窗口重新获得焦点或每 30 秒自动更新；切换身份后不残留上一身份的消息或计数。

## 2. 邀请旅程

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | Mia → Inbox → Invitations | 有 “A paused project could use your experience”（Study Room Finder Pilot），原因 “You shared a finished project about maps. This project uses maps too.”，相关项目链接 Campus Map Kiosk，状态 Pending、有到期时间 |
| 2 | Mia 点 Accept | 显示 “Invitation accepted. Nothing was created or assigned for you.”，状态 Accepted；项目的 Picked up by 数量不变；出现 Continue to pickup，点击进入正常接棒表单（不提交） |
| 3 | 同一邀请再点 Ignore（或通过 API） | 409 “This invitation is no longer available.” |
| 4 | Sarah → Invitations | 有 “A question could use your experience”，原因 “You previously replied as a mentor on a maps project.”；Accept 后说明只有被 Staff 引荐的导师才能发正式回复 |
| 5 | Kevin 打开该问题 | 显示 Interested helpers：Sarah Patel；问题仍是 Waiting for Staff referral，工作台和负载不变；点 Refer mentor 打开原引荐表单，并预选 Sarah |
| 6 | Mia 在 Settings 关闭 Automatic invitations | 未处理的邀请变为 Cancelled；Activity 照常到达；重新开启后不会补发旧邀请 |
| 7 | Kevin → Inbox | 看到 Automatic invitation checks：On、最近成功时间；Invitations 筛选为空时显示 “You're all caught up” |
| 8 | Mia 真正完成该项目的接棒 | Mia 已接受的邀请保留 Accepted，但不再 actionable；之后不再为这个项目发 pickup 邀请 |

## 3. 失败与布局

- 断网或接口失败时，Inbox 显示 “Couldn’t load your inbox.” 和 Retry，不显示假的 0 条或假消息；设置保存失败时回退并提示。
- 390px 宽度下 Inbox、邀请卡片和 Interested helpers 没有横向滚动；所有按钮都能用键盘操作。
- 关闭 runner（不设 `INVITATION_RUNNER_ENABLED`）启动时，状态显示 Off，不会产生邀请；Activity 不受影响。

## 4. 不在本剧本范围

真实 PostgreSQL 多连接、云端或 serverless 定时调度、邮件和浏览器推送、真实认证都 Not run 或不在范围内。
