# P3 当前手动验收预览

## 产品修订后当前状态（优先于下方启动历史）

- 3000现运行 **93359a4eadf511629cef4102ea0ab5abdca02a9c**，BuildID `B8UeIqEWMCMjJXOnwSITn`，PID28852。
- 应用/构建目录为 `C:/Users/23678/.codex/workspaces/buckeye-baton-p3-product-revision`；保持其.next不重建。
- **继续使用同一个p3-review目录下原验收数据库**（下方路径不变），不添加/覆盖样例，不重置用户操作。新运行清单位于product-revision/.data/p3-preview-runtime.json，也同步到主控和p3-review的.data。
- 启动前发现3000已被重新启动且新增p3-review/.env.local配置，旧PID27868已失效。重新核对旧进程29756、旧构建与相同数据库后才升级；保留该原配置文件，通过--env-file加载，不打印/复制/修改key，本次真实模型调用0次。不能继续把该预览描述为未配置key；本次没有验证真实模型请求。
- 停止后备份数据库到 `C:/Users/23678/AppData/Local/Temp/buckeye-baton-before-product-revision-c5a155354cc14a18bc9ac0a9c2b0e759`；启动读取后再次核对11张表的有序记录哈希，与升级前完全一致，6项目/4问题/3帖子及所有原文、关系、AI内容均保留。
- 实际浏览器只读检查：系统建议改名且原入口存在，状态选项仅渲染对应字段，日期UI消失；390px无溢出、pageerror0、AI请求0。未保存表单或提交评论/接棒来改变验收数据。
- 用户只需复验[P3_PRODUCT_REVISION.md](P3_PRODUCT_REVISION.md)三项变更；其他功能已被用户确认通过。main不合并、P4未开始。3001仍停止。

下方是初次4839e77启动历史，其中PID、应用目录与模型未配置说明已被上述现况替代；数据库路径仍有效。

2026-10-24（本地时间）。用户明确要求停止旧3000/P1、3001/P2，并将3000用于P3。下列为启动时快照；今后操作进程前重新核对端口/PID。

- 地址：**http://127.0.0.1:3000**。3001已停止。
- 实际运行代码：**4839e770f2f95130ac1409f5cfaa980583469452**。
- 模式：`next start`生产构建，BuildID `8b0hmz-eow7sXi06aJc3w`，PID **27868**，仅监听127.0.0.1。
- 应用目录：`C:/Users/23678/.codex/workspaces/buckeye-baton-p3-review`（detached4839e77）。这是活跃服务目录，不可归档/删除或重建其.next。
- 数据库：独立持久PGlite，`C:/Users/23678/.codex/workspaces/buckeye-baton-p3-review/.data/p3-manual-4839e77-9461143dc4094423887b2d67cbb1c800`。一次仅一个进程使用。
- 模型：**未启用AI生成，无mock、无真实模型调用，不加载用户API key**。P3规则功能无需模型；Generate introduction缺配置时不可用，不作为本轮新缺陷。原P2配置文件保留，未读取/复制/修改。
- 运行清单：应用目录 `.data/p3-preview-runtime.json`。启动时刻：2026-10-25T02:01:27.7086457Z。

## 验收数据已准备

使用普通虚构seed加手动验收专用数据，启动时5项目/4问题；不是复制或重置旧用户库。按[P3_MANUAL_ACCEPTANCE.md](P3_MANUAL_ACCEPTANCE.md)的TC01–TC10顺序执行。

| 数据 | 起始值 |
|---|---|
| Study Room Finder Pilot，p3-old-paused | Alex所有、Paused、发布时间40天前、无后续，初始推荐分50 |
| How fresh must room data be before students trust it?，p3-old-question | Mia提问、请求Mentor、等待10天、无期限/引荐/回复，问题分30 |
| P3 manual: urgent question，p3-manual-urgent，归Campus Events | Mia提问，初始期望回复日期2026-10-25T14:00:59.391Z，准备时距当前12小时，问题分35 |

从首页打开Study Room Finder Pilot，或访问 `/projects/p3-old-paused`。四身份仍在Exploring as切换，Kevin的My workspace可查看Q-Urgent35在Q-Wait30之前。F样例可用既有Finished项目。

日期是实际时钟，不会一直保持“12小时后”；截止时间过后规则会改为Reply date passed50分，属于预期。用户操作会保存；不要为重复演示擅自重置本库或再次覆盖日期。

## 旧服务与数据

已核对并停止旧P1 PID25596、旧P2 PID31004，未停止其他服务。旧库仍保留：

- P1：`C:/Users/23678/.codex/workspaces/buckeye-baton/.data/pglite`。
- P2：`C:/Users/23678/.codex/workspaces/buckeye-baton-p2-review/.data/p2-preview-df5f050`。
- 原P2 `.env.local`仍在p2-review目录；本次未使用。旧comment-deletion与p2-review目录未清理。

COORDINATOR_HANDOFF、P3_ACCEPTANCE等文档中“原服务仍在/尚未启动P3”的表述是当时快照，运行状态以本文和运行清单为准。不要凭旧PID停止当前服务。

## 启动后只读检查

已验证health为ok/pglite、推荐项目P分50、Staff队列临期35在等待30之前、HTTP构建manifest与BuildID一致；实际浏览器加载首页/Staff工作台，无pageerror。没有提交问题/回复/日期/接棒或AI请求，验收样例保持初始状态。

截图：应用目录`.data/p3-preview-desktop.png`。启动stdout/stderr日志路径在运行清单中；日志、数据库、运行清单和本地辅助脚本均不提交Git。

main未合并，P4未开始，用户手动产品验收尚待反馈。
