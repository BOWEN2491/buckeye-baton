# P3 单 Agent 全栈任务书

2026-10-24。一个Agent连续完成规则计算、API、页面与测试，正常全部实现、自测、推送后只回传一次READY。总控独立验收；本任务书不是P3完成证据。

## 1. 基线与保护范围

- 仓库：https://github.com/BOWEN2491/buckeye-baton
- **协调基线：origin/codex/p3-integration**，包含P2最终应用d97920f与P3冻结文档。P2全部产品验收已通过，PR #3尚未合并；不能从旧origin/main开始而丢掉P2。
- 实现分支：`codex/p3-implementation`。先fetch、核对status/基线，再使用独立clone或独立worktree；存在同名分支先检查后继续，不reset、不强推、不覆盖未知工作。不修改总控的协调分支。
- 不在 `C:/Users/23678/.codex/workspaces/buckeye-baton` 构建或实现，不触碰该目录运行P1的.next和.data；保留3000/P1与3001/P2，以及其他已有服务。
- 特别保留 `buckeye-baton-comment-deletion`（3001应用）及 `buckeye-baton-p2-review`（真实配置与P2活跃数据库），不能当作临时文件清理。运行布局见COORDINATOR_HANDOFF.md第5节。
- Node22、现有Next/TS/Zod/pg/PGlite，不新增依赖、云端资源或AI调用。不需要API key，不读取/复制用户.env；自动回归继续使用既有本地mock。产品文案英文。

先读AGENTS.md、PROJECT_CONTEXT.md、DECISIONS.md、project-docs/index.html、docs/EXECUTION_ROADMAP.md、**docs/P3_CONTRACT.md**、docs/API_CONTRACT.md、docs/P2_ACCEPTANCE.md、docs/COMMENT_DELETION.md；按需读COORDINATOR_HANDOFF.md、P1/P2契约和design/README。P1/P2任务书是已执行记录，不需重做。

## 2. 连续执行阶段

### Phase 0：确认实际模式

按P3_CONTRACT第6节读真实代码与现有测试。核对threadState/threads、删除过滤、角色分组、浏览投影和路由签名。确认自己的空闲端口、独立库与构建目录。无需中途类型交接；不要只输出计划后结束。

### Phase 1：纯规则、批量数据与API

新增p3-types及服务器priority模块，注入测试时钟。按契约实现发布年龄/无人接棒、待回复周期、互斥期限分、max问题聚合、原因和稳定排序；提取共用线程读取，不另写P1状态机。扩展opt-in项目/工作台sort、增加项目priority GET和问题作者dueAt PATCH。保持默认老响应、四数组工作台、原详情四键与AI hash；不新增schema/score存储。

完成阈值、多人权限、重复刷新不写入、日期更新不改变工作负载与旧内容的后端验证。不是只写算法单元测试；还须调用真实API与隔离SQL证明数据来源、权限、队列重算及返回形状。

### Phase 2：正式页面

首页Recommended/Newest与搜索/状态组合，工作台Priority/Oldest first，卡片/工作台可读原因及更新时间/Refresh；保留所有0分项目与原分组。项目页显示原因及所有者建议；作者在自己的问题编辑/移除回复日期，失败保留输入、成功重新加载。保持四身份切换回未筛选首页，默认排序跟随各页面默认值。响应过期/切换身份不得显示上个用户的操作按钮或数据。

不得重做整站视觉，不显示假概率/曝光/通知，不让Mentor看别人队列，不让项目所有者代改他人问题日期。负载候选和P2 AI编辑/确认继续可用。

### Phase 3：回归与交付

固定时钟后端测试 + 正式页面生产start浏览器旅程，桌面/390px；覆盖R3多表单负载刷新、P2原文回退和评论删除等已有回归。运行四项检查，整理证据和Not run，更新API文档、PROJECT_CONTEXT及living文档的已实现状态；全部完成后commit/push和一次READY。

## 3. 改动权限

可改本轮必要src/tests及docs/API_CONTRACT.md、docs/P3_REPORT.md、当前实现状态文档。新增测试接入tests/backend.test.ts真正入口。P3_CONTRACT、计分/权限、依赖与总控验收台账不自行改口径；必要契约冲突集中BLOCKED。常规内部模块拆分无需审批。

不合并main、不创建部署、不进入P4，不修改或清空用户数据，不提交.env/.data/node_modules/.next/test-results。真实Postgres验证可记录Not run，本轮不因缺少云端或key而冒充假成功/阻塞规则实现。

## 4. 十项总控门槛

worker自测不代表总控已验收。每项总控独立验证通过记10%，当前0/10。

| 门槛 | 必须证明 |
|---|---|
| J1 | Paused且零后续才按createdAt共享年龄加分；7/14/28天及非Paused/已有接棒/未来日期正确；不伪造暂停时长 |
| J2 | needs_referral/awaiting_reply待处理资格、无正式回复与多轮follow_up的pendingSince；连续追问不重置，普通评论不影响 |
| J3 | 24h/72h/过期边界与等待封顶、null期限；dueAt是问题回复日期；原因分数与总分吻合，无概率 |
| J4 | 项目只取同一最高分问题，不按问题数堆分；过滤/全体关系计数、稳定tie-break、0分保留、Newest正确 |
| J5 | Staff/Mentor opt-in工作台排序、原分组/权限/默认四数组响应与老项目详情响应兼容，无跨用户队列 |
| J6 | 作者date PATCH的401/403/404/400与合法未来/null更新；拒绝项目所有者代改、额外字段；仅dueAt变化且不改状态/负载/AIhash |
| J7 | 首页/项目页/工作台原因一致、所有者建议及可用动作；改日期/引荐/回复/追问/删除/接棒/状态改变后刷新重算正确，无AI请求或GET写入 |
| J8 | 新操作加载/空/失败/Retry/输入保留、跨身份过期响应、筛选与排序切换、明确更新时间/刷新，390px可用 |
| J9 | P0/P1/P2四身份主线、AI草稿确认/过时回退、原文、删除权限/负载和历史持久化回归；独立库重启/重复setup不损坏记录 |
| J10 | 最终SHA上typecheck/backend/build/start/e2e通过；实测数量/端口/隔离/mock与Not run记录准确，差异无秘密/构建/数据库 |

命令：`npm run typecheck`、`npm run test:backend`、`npm run build`、`npm run test:e2e`；Windows必要时`NEXT_TELEMETRY_DISABLED=1`，在自己的目录运行。没有UI改动后的新错误。测试有意义地覆盖业务与失败，不用只镜像函数实现的测试冒充闭环。

最低浏览器演示：

1. 浏览虚构的老Paused无人接棒项目，Recommended原因可解释；切Newest及搜索/状态组合，全部项目仍可访问。
2. Kevin工作台比较久等/临期问题，显示Priority原因；Sarah只看到自己队列，原Awaiting reply数量不因排序改变。
3. Mia修改自己问题的回复日期并刷新，排序/原因相应改变；失败保留；Alex即使是来源项目所有者也不能代改。
4. Kevin引荐、Sarah正式回复、Mia追问/普通感谢、Sarah再回复、授权删除相关帖子：状态/优先原因/工作负载一致变化。
5. 接棒后原Paused的无人接棒加分消失；新Ongoing、来源与后续、总结历史和AI确认内容保留。所有者建议链接可操作，无假通知。

不要等待真实7天；后端注入固定asOf，浏览器隔离fixture生成足够远离边界的相对日期。真实模型调用**0次**；旧真实AI证据不改写成P3新调用。真实PostgreSQL/Neon/AWS/公网/多实例未跑写Not run。

## 5. 一次最终回传

docs/P3_REPORT.md写分支/基线、交付项、准确公式/来源、命令与结果、固定时钟和浏览器证据、mock/调用次数、未运行/风险。最终commit/push后报告完整HEAD SHA；不要自称总控100%，不要进入P4或合并main。

```text
【转交总控验收｜P3 单 Agent｜READY】
分支：codex/p3-implementation
已推送提交：<完整SHA>
基线：<包含P2及P3冻结契约的提交>
交付：可解释项目推荐、工作台Priority、作者建议与回复日期编辑
检查：typecheck <结果>；backend <实际数量/结果>；build/start <结果>；e2e <实际数量/结果>
模型：本轮真实调用0次；P2浏览器回归使用既有本地mock
详细报告：docs/P3_REPORT.md
未完成/限制：<Not run及实际限制；无则写无>
当前状态：等待总控独立验收；不进入P4、不合并main
```

仅真实阻塞或必须改变契约/依赖时提前一次：

```text
【转交总控处理｜P3 单 Agent｜BLOCKED】
分支/提交：<状态>
阻塞：<具体问题>
已尝试：<安全摘要>
需要决定：<最少必要问题>
已完成/可继续：<不受影响的工作>
```

不需要固定时间汇报，不用复制完整会话或中途提交。用户只转交短块，总控自己fetch报告/代码、按精确SHA验收；返修集中后再次READY。

## 6. 启动提示词

完整可复制版本另存 [P3_START_PROMPT.md](P3_START_PROMPT.md)。将该文件内容发给实现Agent即可；本任务书与契约随协调分支推送，worker须读后实际实施。
