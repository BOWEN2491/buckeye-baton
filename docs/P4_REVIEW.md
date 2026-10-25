# P4 总控独立验收：需要返修

**最新复验（2026-10-25）：** 2ad5607已独立通过四项检查、backend20/20/e2e20/20，R1/R3关闭，原R2三场景通过；但Load more被focus刷新打断后busy不释放，尚需R2-follow-up。当前9/10（90%），详见[P4_RECHECK.md](P4_RECHECK.md)。下文7/10和R1–R3是首轮历史。

2026-10-24（America/New_York）。审查精确提交 **7b8a629151847d25f0a17b3e4cb15b7c32a86664**，基线1c3ed64181097806a2d0eca700e6c64d464d33e6。独立worktree：`C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review`。本报告覆盖worker自报，不代表产品验收通过。

**结论：K1–K10 独立通过7/10（70%），R1–R3必须返修。** 未集成P4应用到协调分支，未合main、未替换3000预览。真实模型调用0，未读取/复制key。

## 独立复跑

| 项目 | 实际结果 |
|---|---|
| Node | v22.23.4，NEXT_TELEMETRY_DISABLED=1 |
| npm ci | 成功，仅独立review目录 |
| npm run typecheck | 通过 |
| npm run test:backend | **17/17**，63.7秒；临时PGlite、模型mock |
| npm run build | 通过，生产Next15.5.28构建 |
| npm run test:e2e | **17/17**，2.1分钟，端口3237 / mock3337；生产start、独立临时SQL、四身份、390px |
| 无页面自动派发 | 既有第1个浏览器用例只调用API，首轮创建、约60秒再次检查通过 |
| 补充后端探针 | API正常返回失效邀请到Unread；数据库初始化失败后runner无下轮，详见R1/R3 |
| 补充页面探针 | 生产服务器3247、独立SQL，受控Inbox API响应；三个刷新场景均复现R2 |

Browser plugin及其browser技能未列出，因此按frontend-testing-debugging技能使用仓库Playwright及独立Playwright探针。页面探针有意控制消息响应，验证生产React页面的刷新/合并逻辑；它们不是第二次数据库集成测试。真实通知/权限/删除的SQL旅程由上述17/17覆盖。

## R1 [P2] Unread列表必须按有效未读语义筛选后分页

位置：`src/server/inbox.ts:74–95`。

当前Unread仅加`readAt IS NULL`，但未读计数排除了过期/取消邀请，导致筛选与计数不一致。有效状态在LIMIT之后才计算，不会过滤记录。

独立临时库加入本人两条未读邀请：一条已cancelled，一条pending但已过expiresAt。`GET /api/inbox?filter=unread`返回200、`unreadCount:0`，items却包含expired与cancelled两条，UI仍标Unread。证据：[后端结果](evidence/P4_BACKEND_PROBES.json)。

返修要求：Unread按与unreadCount一致的语义返回；失效邀请保留在All/Invitations历史。有效筛选须在正确分页边界上完成，不能简单取20条再丢掉失效项，导致后面真正未读被遮住。GET仍不写库，保持数据库微秒游标和本人权限。

新增回归：失效/取消邀请加真正未读Activity混排、多页前部全是失效记录，返回内容/nextCursor/未读数一致，All历史仍保留；同微秒分页继续不漏不重。

## R2 [P2] 刷新必须同步分页和已加载内容

位置：`src/app/inbox/page.tsx:207–213`；相关`markRead/respond/loadMore`。

`loadFirst(true)`只合并首20条、保留所有旧条目，且不更新cursor。独立生产页面复现：

1. 打开空Inbox后产生25条消息，点Refresh：显示20条，**没有Load more**，后5条无法访问，刷新网页后才恢复。
2. Unread中一条消息点Mark as read：页面显示**0 unread**，但消息仍留在Unread，空状态不出现。后续Refresh也不移走。
3. 加载25条后，第25条评论被删除；点Refresh仍显示第25条原预览，**不显示Comment removed**。首20条之外的已加载消息不再被重新验证。

证据：[页面结果](evidence/P4_UI_PROBES.json)、[分页截图](evidence/p4-refresh-pagination.png)、[已读仍留截图](evidence/p4-refresh-unread.png)、[旧删除预览截图](evidence/p4-refresh-deleted-preview.png)。截图均为虚构数据。

返修要求：用明确的已加载分页窗口刷新策略，重新验证整个已加载范围，正确保留稳定顺序/去重/继续加载边界。Unread移走已经读完/失效条目，旧页删除预览同步清除，新消息超过首屏仍能继续读取。不以“只能整页刷新”或“直接丢掉旧页”代替契约的刷新功能；错误不能把已加载内容伪装成最新，身份/筛选的迟到请求仍须丢弃。

新增浏览器回归覆盖上述三个场景，外加已有多页时到来新消息后继续Load more不漏不重；这些回归须在7b8a629失败、返修后通过。

## R3 [P1] 初始化失败不能让自动派发永久停止

位置：`src/server/invitation-runner.ts:12–34`。

`database()`在try之外；loop只有check成功返回后才安排下次。初始化reject会成为未处理Promise rejection，timer保持null且started仍true。默认Node行为可能结束进程；即使框架/监听器截获异常，runner也不会再检查，Staff却仍可读为On。

独立探针：以不可用数据库配置启动默认check，在测试专用监听器中捕获首个unhandledRejection（防止探针进程退出）；随后改为可用临时memory PGlite并成功打开DB，等待多个缩短的20ms周期。结果：`started:true, timer:null, lastCompletedAt:null`，没有后续检查。数据库模块原有connect失败清缓存不能弥补runner已停止。证据同[后端结果](evidence/P4_BACKEND_PROBES.json)。该探针只在临时进程改变env，不改用户配置。

返修要求：数据库获取也进入受控失败处理，最外层循环在失败后仍按间隔安排下一次，不能有未处理reject/忙循环或“运行中”假象；库不可用时安全日志，恢复后写入持久故障/成功状态，保留不重叠与stop语义。一次失败不能令后续start因global started标志永远不执行。

新增回归：首次database初始化失败一次→恢复后自动成功；注入check自身reject也按间隔恢复、无unhandledRejection；停止发生在失败/检查中时不重排；保留现有事务失败rollback/恢复和生产自动检查证据。勿新增公开调试接口或用户可改clock。

## K门槛与环境边界

| 门槛 | 状态 | 依据 |
|---|---|---|
| K1 | 通过 | 增量迁移/重跑/重启与原历史回归，schema无旧表重置 |
| K2 | 通过 | 角色矩阵、去重/排除自己、拒绝写入、通知插入失败业务rollback |
| K3 | **未通过** | 权限/删除脱敏/微秒游标已通过，但Unread有效筛选R1失败 |
| K4 | **未通过** | 基础四角色/移动/刷新入口通过，但刷新窗口R2失败 |
| K5 | 通过 | 共享pending事件、14天/3天、真实公开证据/规范化标签/无候选/排序 |
| K6 | 通过（仅本地逻辑/约束） | 双层滑窗、永久去重、统一DB锁及串行竞争回归 |
| K7 | 通过 | 接受/忽略/失效/到期/偏好与Activity独立，重复动作/409 |
| K8 | 通过 | 接受仅意向，Staff可看当前帮助者，正式引荐/回复/负载权限不变 |
| K9 | **未通过** | 正常生产自动检查已过，但初始化失败恢复R3失败 |
| K10 | 通过（现有测试/交付证据） | 精确最终提交四项检查、旧旅程、四身份/390px；补充探针缺陷另由K3/K4/K9阻塞 |

真实PostgreSQL多连接、Neon/AWS/公网、多实例和云端/serverless调度Not run；不把PGlite串行竞争称为真实多连接通过。生产正常路径的重启/off证据本轮已读worker报告，未独立重复全部长等待；不因此绕过R3。

## 复现工具

源探针：[后端TS](evidence/p4-backend-probe.ts)、[页面JS](evidence/p4-ui-probe.cjs)。它们输出实际观察值，不是已修复后的assert测试；worker需另补会在旧代码失败的正式回归。

在含P4源码/依赖的独立clone根目录执行`npx tsx docs/evidence/p4-backend-probe.ts`：只创建临时memory PGlite、模拟首次配置失败，结果写入未跟踪的.review目录（不要提交临时输出）。此脚本不需要模型、真实pg或用户env。

页面脚本：先用自己的临时SQL和空闲端口启动同一生产构建，runner关闭；设`P4_REVIEW_BASE_URL=http://127.0.0.1:<自己的端口>`后执行`node docs/evidence/p4-ui-probe.cjs`。它用Playwright受控响应复现三个合并场景，JSON/截图写入.review，不连接用户库。默认3247仅为本次已停止的探针服务端口。不要在3000运行或在活跃PGlite目录另开CLI。

## 返修交接

Worker继续`codex/p4-implementation`，以7b8a629为起点集中修R1–R3，不改变冻结产品规则/依赖，不碰3000或用户DB，不合main/不部署。修复后最终SHA重跑四项检查，新增回归说明旧提交失败证据，更新P4_REPORT，再按原任务书回传一次READY。总控随后重验三个未通过门槛及受影响回归；暂不启动用户产品验收。
