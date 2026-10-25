# P4 返修独立复验：9/10，R2剩余一个请求竞态

2026-10-25（America/New_York）。精确提交 **2ad5607285701bfcd0b451d871a822d0932fdd1b**；独立目录 `C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review`。此前7b8a629审查记录保留在[P4_REVIEW.md](P4_REVIEW.md)。

**R1、R3关闭；R2原三个场景通过，但刷新与Load more并发时仍会卡住。** 当前K1–K10为9/10（90%），仅K4未通过。候选未集成、不启动P4用户产品验收、不替换3000或合main。

## 已确认修复

- **R1**：正式SQL/API回归覆盖60条失效邀请混排4条真正未读、跨页过滤、正确计数、历史保留及GET不写；原后端探针现在返回`unreadCount:0, items:[]`。
- **R3**：正式回归覆盖DB首次失败后自动恢复、check两次reject后仍继续、不重叠、检查中stop和重新启动。原初始化失败探针现在为`unhandled:[]`、`timerScheduled:true`、lastCompletedAt非空；不再永久停摆。
- **R2串行场景**：原生产页面探针复验通过：空Inbox新增25条后可见Load more；Mark as read后Unread中0条且出现空状态；第25条删除预览清除并显示Comment removed。新增正式浏览器用例也纳入最终全量复跑。

证据：[后端结果](evidence/P4_RECHECK_BACKEND_PROBES.json)、[页面结果](evidence/P4_RECHECK_UI_PROBES.json)。页面探针为生产React页面+受控API响应；正常SQL旅程由正式套件验证，两者不混称。

## R2-follow-up [P2] 自动刷新打断Load more后，busy标志永久不释放

位置：`src/app/inbox/page.tsx:243–255`，特别是249行迟到响应return与253–255行清loading的条件。

**触发：** 用户点击Load more，请求尚未返回时切回浏览器窗口（focus触发自动刷新），或遇到30秒自动刷新。刷新增加generation，旧分页响应被正确丢弃，但同时跳过了`setMore({loading:false,...})`。旧分页失败时catch也只在generation相等时清busy，同样存在问题。

**独立复现步骤：**

1. 本人Inbox有25条消息，初始显示20条，Load more可用。
2. 用Playwright暂缓带cursor的分页响应，点击Load more，按钮进入Loading…。
3. 触发window focus，等自动刷新首屏完成。
4. 放行之前的分页响应并等待页面稳定。

**实际：** 20条仍可见，正常Load more按钮为0，存在1个disabled的Loading…按钮。后5条仍无法访问；不是请求尚未完成，因为已明确放行并等响应结束。

证据：[复现截图](evidence/p4-refresh-loadmore-race.png)，结果JSON的`overlappingRefresh`为`visible:20, loadMoreVisible:0, stuckLoading:1, stuckDisabled:true`。所有内容为虚构fixture，未使用真实用户库。

**预期：** 丢弃过期分页数据时仍释放该请求的busy状态；刷新完成后可继续Load more且无重复、漏项或旧身份/旧筛选数据。不要通过禁用焦点/定时刷新规避。

**修复范围：** 补齐R2本来就要求的刷新/分页请求协调；没有新增产品功能或更改契约。可将分页请求身份与列表刷新generation分开管理，或在受控取消/finally路径释放属于该请求的busy；避免旧请求清掉新请求的loading或覆盖新游标。保留现有已修复的三个场景。

**新增回归：** 故意延迟Load more→focus/定时刷新→旧请求成功或失败结束→busy恢复、按钮可用→再加载最终恰好25个唯一item；同时保留身份/筛选切换的迟到响应隔离。该回归应在2ad5607失败、修复后通过。

## 独立命令与限制

Node22.23.4，NEXT_TELEMETRY_DISABLED=1。精确提交2ad5607的typecheck、生产build均通过；backend **20/20**（78.0秒），生产start浏览器 **20/20**（2.2分钟，含新增R2三项和390px）。正常无页面自动检查首轮/60秒二轮通过。所有测试使用独立临时PGlite、旧P2仅mock；真实模型调用0。用户3000仍为P3 PID38224，测试端口3237/mock3337和补充页面3247，未读取/复制用户env/key；测试服务已结束，用户服务未改。

首次数据库失败探针只在自己的临时进程切换不可用配置→memory库；timer输出改为布尔值以避免序列化Node Timeout循环引用，业务触发逻辑与原探针一致。

Browser plugin及其browser技能未列出，沿用仓库Playwright和独立页面探针。真实pg多连接、Neon/AWS/公网/多实例/serverless调度Not run；PGlite并发仍只证明串行逻辑与约束。

### 可执行补充探针

[后端TS](evidence/p4-recheck-backend-probe.ts)、[页面JS](evidence/p4-recheck-ui-probe.cjs)。在含P4源码和依赖的独立clone运行，不能在旧P3/3000或用户库上执行。后端`npx tsx docs/evidence/p4-recheck-backend-probe.ts`只用memory库。页面需启动自己的生产构建、临时SQL和空闲端口，设`P4_REVIEW_BASE_URL`后`node docs/evidence/p4-recheck-ui-probe.cjs`，结果/截图写未跟踪的.review目录（不要提交临时输出）。它明确等待被延迟的分页Response.finished后再记录卡死，排除“只是请求仍未结束”。

### 门槛更新

K1/K2/K3/K5/K6/K7/K8/K9/K10通过，K4因R2-follow-up保留未通过。原R1、R3不再阻塞；现有20项浏览器通过不包含本次延迟分页与focus交错，所以不能覆盖这项失败。仅余这一处，不把已通过项目回退。

## 原Agent继续方式

继续codex/p4-implementation，从2ad5607只修本报告R2-follow-up。R1/R3已关闭，无需重复改规则；不得改依赖/冻结契约、3000、用户数据或main。新增回归并在最终SHA重跑四项检查、更新P4_REPORT、push，正常再一次READY。总控收到后只重验受影响门槛与必要回归，避免无关扩展。
