# Current P4 preview — product revision (2026-10-25)

- URL: http://127.0.0.1:3001/inbox
- Actual application source: **5a5fddfa527b2dff509431ad05bcaa36a8c7dc80**; BuildID **zxqkg5OxLuNqffTSgakce**.
- Active app/build: `C:/Users/23678/.codex/workspaces/buckeye-baton-p4-product-revision`. Do not rebuild, switch or archive while serving.
- Node PID **40108**, hidden launcher **40512**. Recheck listener before any operation.
- Same persistent database: `C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review/.data/p4-preview-e2e-737dae5553fa44779b0d1d0ce0ff3459`.
- Same real OpenAI/gpt-6-luna configuration loaded via Node `--env-file` from old p4-review `.env.local`; no key printed/copied/committed. Old p4-review remains protected as the database/config holder. **Zero real model calls for this revision.**
- Runner enabled, pickup invitations only. Legacy help invitations are hidden; pending ones settle on check. Manual referrals and activity remain.
- Before restarting, stopped only verified3001 PID14344 and copied the offline database to old p4-review `.data/p4-before-product-revision-20261025`.
- After restart, compared all8 projects, full project details, discussions and private introduction states: **exactly unchanged**. Sarah's legacy help invitation is absent; runner enabled with successful check and no error. Live Inbox desktop/390px checks pass without writes.
- 3000/P3 PID38224 unchanged. Main and PR#3 not merged; no deployment.
- Current rules and final checks: [P4_PRODUCT_REVISION.md](P4_PRODUCT_REVISION.md). Runtime manifest copied to active app, old config/database holder and coordinator `.data/p4-preview-runtime.json`.

---

The following is historical setup evidence for the previous372646c preview; use the current runtime above.

# P4 独立手动验收预览

**AI已启用（2026-10-25）：** 用户自行填写P4 `.env.local` 后，已只重启3001，以Node `--env-file`加载本地配置。真实OpenAI / gpt-6-luna，非mock；一次生成返回200、1句/2标签，仅保存Mia的Campus Map Kiosk未发布草稿，没有确认或更改公开卡片。安全结果见[evidence/P4_AI_ENABLE_RESULT.json](evidence/P4_AI_ENABLE_RESULT.json)。key未打印、复制或提交Git；以后运行回归仍用mock，不能把此单次验收当持续真实调用授权。

重启前后8个项目及讨论记录完全一致，生成草稿后公开项目列表仍一致。保持同一SQL目录、BuildID与应用372646c，自动邀请仍开启。停止服务后另存备份于P4目录`.data/p4-before-ai-backup-20261025`。最初组合命令被自动审批拒绝且未执行；随后以固定P4 PID分步停服、备份、启动完成，没有扩大操作范围。

2026-10-25（America/New_York）。用户授权启动独立P4预览；**3000/P3及原有数据保留，main未合并**。端口/PID为本次启动快照，今后操作前重新核对runtime manifest和端口，不凭旧PID停进程。

## 当前运行

- 地址：**http://127.0.0.1:3001**；Inbox：http://127.0.0.1:3001/inbox。
- 实际应用源SHA：**372646c7d5338c09a2868b3c8191d1a4dfdcf835**，独立验收通过的最终应用。
- 模式：`next start --hostname 127.0.0.1 --port 3001`；BuildID **w1qQ1NbMYOpR3DvMK9Vqd**。
- 应用与构建目录：`C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review`，detached372646c；现在是**活跃预览目录**，不要归档/删除、切换提交或重建其.next。
- Next服务PID **14344**；隐藏PowerShell启动器PID **5852**（AI配置重启后）。
- 独立持久PGlite：`C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review/.data/p4-preview-e2e-737dae5553fa44779b0d1d0ce0ff3459`。只有这个Next进程连接，禁止运行另一CLI直接打开此活跃数据库。
- 自动邀请：**开启**，启动时检查，此后每次完成后60秒再检查。
- 模型：**真实OpenAI / gpt-6-luna，非mock**，只加载P4自己的.env.local，不加载/复制P3的配置。本次真实调用1次、HTTP200，后续生成由用户操作。

## 数据与启动检查

新建SQL后，在服务启动前运行仅演示fixture脚本，之后关闭初始化连接再启动Next。没有复制、迁移、清空或覆盖原P1/P2/P3库。此库会保留本轮手动验收产生的操作，刷新页面不会重置。

虚构数据包括：Study Room Finder Pilot（Paused，发布40天、无人接棒）、一个等待10天的问题、Mia的Finished Campus Map Kiosk及Sarah在该项目的一条正式回复。这些只用于独立演示，不是原3000用户记录，也不是声称真实项目成果。

未打开页面前只读检查确认：health为pglite/ok；Staff runner为enabled=true、intervalSeconds=60、lastCompletedAt非空、error=null。Mia有一条pending pickup邀请，Sarah有一条pending help邀请，目标均为Study Room Finder Pilot。之后浏览器只打开Inbox、筛选Invitations，没有接受、忽略或标已读。

生产页面检查通过：Inbox/Accept可见，桌面与390px截图保存，手机无横向溢出、pageerror0。使用仓库Playwright（Browser plugin及其browser技能未列出），没有重复运行无变化的完整套件；最终应用此前20/20后端、23/23浏览器验收见[P4_ACCEPTANCE.md](P4_ACCEPTANCE.md)。

## 手动验收入口

1. Mia → Inbox → Invitations：查看接棒邀请，接受后仍需正常填写接棒表单。
2. Sarah → Inbox → Invitations：查看求助邀请；Kevin在原问题可看Interested helpers，再人工引荐。
3. 完整动态通知、未读/刷新/删除和设置操作，按[P4_MANUAL_ACCEPTANCE.md](P4_MANUAL_ACCEPTANCE.md)从第1节开始；不需要重复该文件的建库/启动步骤。

同一天限频/永久去重是真实规则；接受或忽略后不会自动补发原邀请。不要为再次演示重置用户操作，另建演示库才可重新开始。

## 运行清单与保护

应用`.data/p4-preview-runtime.json`保存URL、实际SHA、BuildID、数据库、进程与启动时间，并复制到总控目录`.data/p4-preview-runtime.json`。同目录`start-p4-preview.ps1`为无秘密启动脚本，stdout/stderr日志留在.data；这些均被Git忽略。

3000仍监听原P3 PID38224，应用p3-detail与数据库/配置p3-review均未改。P4服务会持续运行供用户验收；本次不合main、不部署公网，真实pg/Neon/AWS/多实例验证仍未进行。

## 2026-10-25 status update

The P4 app was stopped after the user approved the P5 preview upgrade. P5 now runs on port3001 using this same persistent database and the protected `.env.local`; the database has an independently verified pre-upgrade backup and the additive migration plus simulation import are recorded in [P5_PREVIEW.md](P5_PREVIEW.md). The old P4 app/build directory remains available but is not the active preview. Port3000/P3 remains unchanged. P5 is awaiting manual product acceptance; no P5 merge or public deployment has occurred.
