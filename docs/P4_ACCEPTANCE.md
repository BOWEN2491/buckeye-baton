> Product acceptance update (2026-10-25): final application5a5fddf and both product revisions passed user acceptance; merge explicitly authorized. See RELEASE_ACCEPTANCE.md and P4_PRODUCT_REVISION.md. The original technical report below remains historical evidence.

# P4 总控最终独立验收：10/10

2026-10-25（America/New_York）。独立核验精确提交 **372646c7d5338c09a2868b3c8191d1a4dfdcf835**，worker分支codex/p4-implementation，起始基线1c3ed64181097806a2d0eca700e6c64d464d33e6。

**结论：K1–K10本地技术验收全部通过（100%），R1/R2/R3及R2-follow-up关闭。** 已将接受版本集成到codex/p4-integration，合并冲突仅涉及两份状态文档；应用、schema、依赖和测试与被测提交一致。main和PR #3未合并，用户P4手动产品验收尚未开始；现有3000/P3服务及数据不变。

## 最终提交上的独立检查

独立目录`C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review`，Node22.23.4，NEXT_TELEMETRY_DISABLED=1。复用已安装的相同依赖，本轮没有更改依赖或配置用户凭据。

| 检查 | 实际结果 |
|---|---|
| npm run typecheck | 通过 |
| npm run test:backend | **20/20**，76.1秒，临时PGlite；包括原P0–P3及R1/R3回归 |
| npm run build | 生产Next15.5.28构建通过 |
| npm run test:e2e | **23/23**，2.3分钟，自动生产start、隔离SQL；端口3237/mock3337，含四身份与390px |
| 无页面自动派发 | 首个用例仅API，启动自动邀请和60秒二轮检查通过，不由GET触发 |
| 原R2补充探针 | 三个串行场景及延迟分页/focus竞态均正确，结果见下方 |

真实模型调用 **0次**。旧P2回归只用本地mock；未读取、复制或更改用户API key。Browser plugin及其browser技能未列出，按既有frontend-testing-debugging流程使用仓库Playwright和独立页面探针。

## 返修关闭依据

- **R1：** Unread和未读数采用相同有效语义；失效邀请在分页边界之前过滤，不遮住后续真正未读；60条失效/4条有效混排与精确游标回归通过，GET不写历史。
- **R2：** 刷新重新读取已加载窗口，列表/游标同步更新；新消息仍能继续翻页，已读项移出Unread，旧页删除正文清除。三个正式页面回归通过，原受控页面探针再次确认。
- **R3：** 数据库初始化失败受控且自动重试，恢复后持久故障/成功时间；check抛错、检查中stop、重新启动、不重叠与无未处理reject回归通过。
- **R2-follow-up：** Load more有独立请求标识；刷新使旧分页失效并释放busy，旧响应不能覆盖新列表/游标或清理新请求busy。延迟分页成功/失败×focus刷新两个正式用例通过，筛选切换迟到响应隔离也通过。

独立原探针用生产页面+受控API响应，延迟的旧分页Response.finished之后再观察：正常Load more可见1个，Loading…为0，stuckDisabled=false；随后继续加载恰好**25条、25个唯一预览**。同时确认Unread已读后0条、旧页删除预览不再出现。受控探针验证React请求协调，不冒称第二次SQL全旅程；真实数据库旅程由23项正式浏览器测试覆盖。

证据：[结果JSON](evidence/P4_FINAL_UI_PROBES.json)、[恢复后截图](evidence/p4-final-loadmore-recovered.png)、[可执行探针](evidence/p4-final-ui-probe.cjs)。探针仅供自己的独立生产预览使用，P4_REVIEW_BASE_URL指定空闲测试端口，输出未跟踪的.review目录，不操作3000或用户库。截图和测试内容均为虚构数据。

首轮[P4_REVIEW.md](P4_REVIEW.md)的7/10和[P4_RECHECK.md](P4_RECHECK.md)的9/10保留为历史失败证据，不再表示当前仍有这些阻塞。

## 十个门槛

| 门槛 | 结果 |
|---|---|
| K1 增量迁移/约束/重跑/持久与历史 | 通过 |
| K2 收件人矩阵/去重/自发排除/同事务 | 通过 |
| K3 私人权限/有效Unread/删除脱敏/精确分页 | 通过，R1关闭 |
| K4 四角色Inbox/刷新/游标/迟到请求/失败恢复 | 通过，R2及follow-up关闭 |
| K5 两类资格/真实公开证据/稳定匹配 | 通过 |
| K6 双层限额/永久去重/锁顺序 | 通过，仅本地逻辑及约束验证 |
| K7 应答/过期/取消/偏好及Activity独立 | 通过 |
| K8 意向不等于接棒或引荐/Staff有效帮助者 | 通过 |
| K9 无页面runner/初始化与事务失败恢复/停止 | 通过，R3关闭 |
| K10 最终四项检查/原旅程/手机/报告 | 通过 |

## 运行环境与未验证项

- 真实PostgreSQL多连接、Neon、AWS、公网、多实例和云端/serverless调度：**Not run**。PGlite为单进程，串行竞争测试只证明本地逻辑/约束。Runner需要持续Node进程；进程停止时不派发。
- 本轮独立复跑了正常启动/60秒二轮、DB初始化与事务失败恢复和stop；worker此前长等待的off/同库重启证据已审阅，本轮未将其全部另跑一次。
- 演示身份不是生产认证；未部署、未创建付费服务、未调用真实AI。
- 补充页面服务器3247及自动测试服务器均已停止。3000仍是原P3应用38e4901、PID38224；原PGlite目录、模型配置和用户操作记录保留。本轮没有把新虚构fixture写入用户库。

## 下一步

按[P4_MANUAL_ACCEPTANCE.md](P4_MANUAL_ACCEPTANCE.md)准备**独立P4预览与临时演示库**，再由用户做Activity四身份、邀请、设置和刷新体验的产品验收。当前3000仍是P3，不能直接用来验收P4。只有后续明确授权才合并main；本技术验收不代替用户产品验收或云端验证。
