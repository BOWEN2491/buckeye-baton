# P4 单 Agent 全栈任务书

2026-10-24。**实际实施，不只输出计划。** P3 已通过用户产品验收；本轮一个 Agent 完成统一 Inbox、角色动态通知、自动匹配邀请与限频。正常只在全部实现、自测、提交并推送后回传一次 READY，总控独立验收后再给用户手动产品验收。

## 1. 分支、环境与必读

- 仓库：https://github.com/BOWEN2491/buckeye-baton
- 协调基线：**最新 origin/codex/p4-integration**，必须包含已验收应用 `38e4901b3b975fe222984ca05d6b03cdd63375a7` 和本轮三份 P4 文档；此前协调 HEAD c1441fd 为文档补充。不要从没有 P2/P3 的旧 main 开始。
- 实现分支：**codex/p4-implementation**。使用自己的 clone/worktree、.next、临时SQL和空闲端口。先 git status/fetch 核对已有工作；保留修改，不 reset、不强推、不覆盖同伴分支。
- 保持 Node22/Next15/TS/pg/PGlite 与现有依赖，UI 全英文，不新增 SDK、外部服务或依赖。必要 package.json 脚本可调整，但 dependencies 不变。
- 不改 main、不合并 PR #3、不部署公网；P4 不调用真实 AI，不读/复制用户 key，不要求用户再次提供凭据。旧 P2 浏览器回归用现有 mock。

先读 project-docs/index.html、AGENTS.md、PROJECT_CONTEXT.md、DECISIONS.md、docs/EXECUTION_ROADMAP.md、**docs/P4_CONTRACT.md**、docs/API_CONTRACT.md、docs/P3_PRODUCT_REVISION.md、docs/COMMENT_DELETION.md。契约为规则/API/类型依据；旧 P3 的日期编辑/期限加分已被产品修订撤销。

### 环境保护

不要在总控目录 `C:/Users/23678/.codex/workspaces/buckeye-baton` 实现或构建，不触碰其 .data/.next。
**3000 保留当前 P3 预览**：应用目录 `buckeye-baton-p3-detail`，实际应用源 SHA 38e4901；数据库及用户配置在 `buckeye-baton-p3-review`。不能清理这些 worktree，即使 detached 或 HEAD 仅增加文档。3001 已停，不代表其他新占用服务可覆盖；启动测试先查空闲端口。

保留旧 P1/P2 数据，包括 p2-review 的 .env.local 与 .data。运行进程信息以 docs/P3_PREVIEW.md 最新段/本地 runtime manifest 为准。单个 PGlite 目录只能一个进程连接；测试不得复用/复制用户库。无法访问总控目录时仍遵守“不操作其他 clone/服务”原则。

## 2. 一个 Agent 连续做完的阶段

### Phase 0：发现与实现准备

按 P4_CONTRACT 第11节读取真正的 API/SQL/页面/测试模式，核对版本和官方 Next15 启动钩子。记录 allowed APIs 与关键缺口于最终报告。先设计共用 p4-types 与事务锁顺序；不加公开“发消息/派发”后门。使用适用的 React、数据库和本地测试技能；设计与发现仅是准备，不代表功能通过。

### Phase 1：统一 Inbox 与角色动态通知

参照现有 Database.transaction、actor、useResource 模式实现可重跑增量表、鉴权 API、类型、分页、已读、导航未读数、Inbox 页面和偏好区。将 askQuestion/addPost/refer 的真实业务写入与通知放同事务；落实收件人矩阵、自发排除、同事件同收件人去重和软删除脱敏。先完成 Alex/Mia/Kevin/Sarah 四身份旅程，不移走旧工作台。

阶段内自验：通知与业务 rollback 原子性、同毫秒分页、权限和原 P1 状态/负载/删除回归。此阶段不向总控单独汇报，继续后续阶段。

### Phase 2：自动邀请、匹配与派发

按契约实现两类目标、真实证据匹配、永久目标去重、滑动限额、到期/取消、接受/忽略和偏好；邀请与通知共用 Inbox。接入 Staff Interested helpers，仍使用原手动引荐。统一 dispatcher 与相关写路径的数据库锁顺序，防止回复/接棒后发送旧邀请。不要自己设计另一套优先分或把未回答等同未解决。

用官方 register/Node 动态导入模式实现显式启用、启动检查与60秒无重叠 runner，复用同进程 database；禁止 GET/浏览器触发派发、第二进程打开活跃PGlite或仅内存限频。保留持久状态、错误恢复与 Staff 可读状态。

阶段内自验：固定时钟完整边界，生产无浏览器自动派发、停用、重启去重、失败恢复，接受不自动建项目/引荐。符合者不足就空状态，不伪造 Sarah 帮助历史、不增加可切换演示身份。

### Phase 3：完整验证、说明与交付

运行 typecheck、test:backend、build、test:e2e（生产 start、隔离SQL、模型 mock、390px）。P3微秒探针/年龄规则/Detail/按状态表单、P2确认回退/负载、评论删除与旧采用410继续通过。新增测试必须接入命令入口，测试只改自己的临时数据。

写 docs/P4_REPORT.md、docs/P4_MANUAL_ACCEPTANCE.md 和 docs/API_CONTRACT.md 的**实际实现**记录，补充 README/.env.example 的变量名及启动说明、更新 project-docs 对应区块与 DECISIONS。冻结契约/任务书/总控验收台账不自行改权重或标通过；实现偏离契约需先报告。

全量最终代码验证后提交、push codex/p4-implementation，回传一次 READY；不要停在设计/后端完成，也不要自行合 main、进入部署或下一阶段。

## 3. 十个总控独立验收门槛

每项通过计10%；worker 自报、任务书提交和跑到一半不自动计分。初始 **K1–K10 = 0/10**。

| 门槛 | 必须证明 |
|---|---|
| K1 | 增量表/约束/重跑迁移与重启持久；旧数据原文、历史、日期/AI版本不变；不回填旧 Activity |
| K2 | 活动通知四身份矩阵正确，同人多身份去重、自发排除、无效操作不发，业务/通知同事务 rollback |
| K3 | 本人 Inbox/游标/已读/偏好/应答权限；软删除不泄漏正文，同毫秒分页不漏不重，GET 无业务写入 |
| K4 | 四角色导航/未读/All-Unread-Invitations、已读持久、明确打开原问题、30秒/焦点刷新、身份异步隔离与失败状态 |
| K5 | 两类目标年龄与共享 pending event、真实相关证据匹配/稳定顺序/无候选，绝无“解决率”或伪造历史 |
| K6 | 每人/目标双层滑动限额、永久去重、DB约束/锁；双派发及回复/接棒/关闭开关竞争语义正确 |
| K7 | pending接受/忽略/过期/取消/重复/409；周期变化失效，关闭再开不补发，Activity 不受邀请设置影响 |
| K8 | 接受只是意向；旧接棒与手动引荐权限保持，Staff 只看有效 Interested helpers，不改变状态/负载 |
| K9 | 持续Node生产 runner 无页面自动运行、关闭/失败恢复/重启不重复，构建与GET不派发，同进程PGlite与安全状态可证 |
| K10 | 最终 typecheck/backend/build/start/e2e、全部旧旅程、390px、失败输入/键盘可用；报告与手动剧本可复验，Not run准确 |

## 4. 必须具备的实证

- **Activity 旅程**：Mia在Alex项目提问→Alex收新问题；Kevin引荐Sarah→Mia收引荐、Sarah收任务通知；Sarah正式回复→Alex、Mia和Kevin各一条；Mia感谢→Alex一条、Sarah不被当followup提醒；Mia明确追问→Sarah收到、负载恢复；Sarah再回复→Kevin收到新消息。每人不收自己触发的事件；Alex同时是问题作者时不重复。
- **隐私**：他人 ID/cursor/应答403或404符合契约、角色切换无残影；删除已通知帖子后所有 Inbox 的正文预览清空，原队列重算正常。
- **邀请旅程**：仅临时库准备有真实相关经验的人和老Paused/老求助，启用runner且不开页面→生成邀请；接受/忽略/关闭设置、邀请失效、Staff看意向和沿用人工引荐；真正Pickup之后旧目标不再发。展示无人符合时的空结果。
- **时间/竞争**：固定 clock 覆盖刚好14天/3天/7天、24h与7d滑窗、同一目标新轮次永久去重；注入失败证明rollback/恢复，记录并发在PGlite只是逻辑/约束验证。
- **自动性**：保存无页面运行前后证据、启用变量/检查间隔、重启/失败后 lastCompletedAt；不提交任何真实env、DB或含正文隐私的日志。测试fixture老日期只进临时库，不改常规seed或用户预览。
- **旧回归**：年龄分不受dueAt影响，状态隐藏字段保留，Detail键盘操作、P3微秒同分顺序、P2 mock简介确认/过时、两表单负载刷新、多轮回复/删除/接棒幂等与历史410。

真实 PostgreSQL/多连接、Neon/AWS/公网/serverless调度未运行则写 **Not run**。不要为了达标擅自接收费账号或模型；P4真实调用0次。局部测试失败应修复并在最终SHA重跑，不能引用旧提交结果宣称最终代码通过。

## 5. 汇报：正常一次，真正阻塞才额外一次

最终报告须有精确基线/交付SHA、文件与接口、实际命令/数量、通知矩阵/自动runner证据、模型0调用、截图/手动剧本、已知限制及Not run。正常仅复制下面短块给总控，用户无需转交整段会话：

```text
【转交总控验收｜P4 单 Agent｜READY】
分支：codex/p4-implementation
已推送提交：<完整 SHA>
基线：origin/codex/p4-integration @ <起始完整SHA；含38e4901及P4契约>
交付：四角色Inbox与动态通知、经验匹配自动邀请、限频去重、接受/忽略/设置
检查：typecheck <结果>；backend <实际数量>；build/start <结果>；e2e <实际数量；含390px>
自动派发：<生产持续Node；无页面证明、间隔/重启/恢复结果；测试数据库>
模型：真实调用0次；旧P2回归用mock
详细报告：docs/P4_REPORT.md；手动验收：docs/P4_MANUAL_ACCEPTANCE.md
未完成/限制：<如实列Not run/边界>
当前状态：等待总控独立验收；不合并main、不改3000预览、不部署
```

契约/依赖必须改变、真实权限/分支问题、推送失败，或同类故障两次尝试仍不能继续才提前报告；仅暂停依赖决定的部分，其他可做部分继续。普通实现细节自主处理，不逐阶段索取许可。

```text
【转交总控处理｜P4 单 Agent｜BLOCKED】
分支/提交：<已推送SHA或未推送原因>
阻塞：<具体问题和安全错误摘要>
已尝试：<方法/结果>
需要决定：<最小必要决定>
已完成/仍可继续：<可独立推进的部分>
```

总控据精确提交独立验证K1–K10，需要返修则集中反馈；worker修完后再一次READY。无需定时回传进度或每层交接，不宣称后台监控外部Agent。
