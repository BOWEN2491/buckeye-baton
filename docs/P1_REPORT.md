# P1 实现报告（单 Agent 全栈）

2026-10-24 · 分支 `codex/p1-implementation`（基线 `origin/codex/p1-integration` @ 9e0390a）· 契约 `docs/P1_CONTRACT.md`
本报告是实现方自测，**不等于总控验收通过**，不给总体进度计分。

## 完成项

- **共用类型** `src/shared/relay-types.ts`：按契约实现 PickupType/PickupInput/RelayLink/RelayProjectDetail/ProjectQuestion/ProjectPost/ProjectReferral/QuestionThread/Workbench/QuestionInput/PostInput/ProjectReferralInput，User/Project/Lesson 沿用 `types.ts`。
- **增量迁移** `db/schema.sql`：新增 `project_relations`、`project_questions`、`project_posts`、`project_referrals`（均 `IF NOT EXISTS`）。唯一约束：`(ownerId,requestId)`、`projectId`（一个直接来源）、`project_referrals.questionId`。旧 projects/lessons/comments/referrals/adoptions 不改动。
- **服务端** `src/server/relay.ts`（请求工具抽到 `src/server/http.ts`，`api.ts` 行为不变）：
  - 接棒：只有 Student 可以操作，来源须为 Finished/Paused，包括自己的项目；事务内创建新 Ongoing 项目和关系记录。重试返回 200 和同一项目，同键不同输入返回 409，并发重复只创建一个。来源项目内容、状态、所有者不变。
  - 问题：任何 Student 可在任意状态的项目提问；dueAt 可空，填写时须为未来的 ISO UTC。
  - 帖子：四种身份都能发普通评论；follow_up 仅限提问者；mentor_reply 仅限被引荐的 Mentor。
  - 引荐：仅 Staff；每问题一条，重复或并发返回 409，开放讨论返回 409，目标不是 Mentor 返回 400。
  - 状态推导和工作台按契约实现；状态改变不关闭问题。
  - 固定虚构样例：`question-events-shifts`（需引荐）、`question-checkin-reuse`（开放讨论）。
- **页面**：
  - `/projects/:id/pick-up` 接棒表单：方式、新名称、目标，右侧是来源的只读参考。取消返回来源；提交中禁用；失败保留输入；重试复用同一 requestId；成功后进入新项目并显示提示。
  - 项目详情：显示来源行和创建时的目标，以及 “Picked up by (n)” 列表。“Questions & guidance” 区包括：提问（可选 Yes/No 导师、期望回复日期，本地日期取当天 23:59 转为 ISO UTC，显示按本地时区）；平铺帖子，正式回复带 “Referred mentor reply” 标识，另有 Follow-up 和 Comment 标签；Staff 引荐表单，含 409 “Already referred” 提示和 Refresh question；被引荐 Mentor 可多次正式回复。
  - `/workspace`：Staff 显示 Needs referral / Referred，Mentor 显示 Awaiting reply / Replied，条目链接到 `/projects/:id#q-:questionId`，页面会定位并高亮对应问题。学生工作区保持原样。
  - 占位文案已全部移除；未恢复 Lesson 或采用 UI。
- **文档**：`docs/API_CONTRACT.md` 增加 “P1 relay endpoints” 运行接口说明。

## 主要文件

`src/shared/relay-types.ts`、`src/shared/fixtures.ts`、`db/schema.sql`、`src/server/{relay,http,api,validation,seed}.ts`、`src/app/api/projects/[id]/{pickups,questions}/route.ts`、`src/app/api/project-questions/[id]/{posts,referral}/route.ts`、`src/app/api/workbench/route.ts`、`src/app/projects/[id]/pick-up/page.tsx`、`src/app/projects/[id]/page.tsx`、`src/app/workspace/page.tsx`、`src/components/{project-questions,relay-links,workbench}.tsx`、`src/lib/client.ts`、`src/app/globals.css`、`tests/relay.test.ts`、`tests/backend.test.ts`、`tests/e2e/{relay,journey}.spec.ts`。

## 测试命令与结果（Node v22.15.1，Windows 本机）

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run test:backend` | 5/5 通过（新增 2 项 P1 测试，原 3 项 P0 测试保留，其中 detail 键断言更新为含 source/successors） |
| `npm run build` | 通过（需设 `NEXT_TELEMETRY_DISABLED=1`：本机 Next 遥测配置写入报 EXDEV，与代码无关） |
| `npm run test:e2e` | 7/7 通过（32.6s）；用 `next start` 生产服务器和独立临时 PGlite，即同时确认了生产启动 |

后端覆盖：401/403/404/400；接棒来源规则；重试 200；同键异输入 409；并发重复只建一个；来源不变；关系目标不随后续编辑改变；dueAt 过去时间、非 ISO、纯日期都返回 400；引荐重复和并发 [201,409]、开放讨论 409；回复归属；thanks/普通评论不改变队列；follow_up 重新进入待回复；多轮正式回复；跨问题不串线；暂停后问题仍开放；重复 setup/seed 和重启后数据保留；旧 comments 可读、旧采用接口仍返回 410。

浏览器覆盖：Alex 来源（Picked up by 0）→ Mia 接棒（空提交拦截、503 失败后保留输入、重试复用 requestId、API 重放返回 200）→ 来源显示后续 → Mia 提问（失败后保留输入、期望日期）并开一个开放讨论 → Kevin 工作台（开放讨论不出现）→ 定位到问题并引荐 Sarah，加 Staff 评论 → 另一问题模拟并发引荐 409 → Sarah 工作台 Awaiting reply(2) 并正式回复 → Mia 发感谢（状态不变）、发帖失败保留草稿、明确追问 → Sarah 看到 New follow-up 并再次回复 → Alex 只有评论框 → Mia 将项目改为 Finished，问题保留 → Alex 在来源看到后续项目为 Finished → 刷新后持久。390px 下检查新项目、来源、接棒表单、两种工作台，均无横向溢出；每个用例无客户端异常或 console error（测试会忽略故意制造的 409/503 资源加载错误）。原 P0 的 5 项浏览器用例保留，其中原占位用例改为检查新入口且不触发写请求。

截图证据：e2e 运行时写入 `QA_SCREENSHOT_DIR`（默认在系统临时目录 `buckeye-baton-p1-qa/`），包括 pickup-form、staff/mentor workbench、relay-project 桌面版，以及 mobile-*。本次运行的截图保存在本机临时目录，未提交到仓库。

## 未完成项与风险

- **推送**：本机 GitHub 凭据无效（`Invalid username or token`），提交只在本地，见交付短块。
- **真实 PostgreSQL/Neon/AWS**：Not run。本地只用 PGlite。PGlite 是单连接，事务串行执行，所以“并发”测试证明的是逻辑和约束路径，而不是多连接竞争；`pg` 模式下依赖唯一约束（23505）重读或返回 409，代码已处理，但尚未在真实 pg 上验证。
- 设计稿中未批准的内容未做：共同所有者、自动延续 Mentor、Ongoing 接棒、选择性带入、帖子编辑删除、“已解决”状态、等待天数标签，以及 AI、推荐、通知等 P2+ 内容。
- 已接棒的 Finished/Paused 后续项目同样可以再被接棒（契约未禁止）；关系只记录一层直接来源。
- 工作台用公开的 `/api/projects` 列表补充项目名称；问题量很大时会有额外开销，属于演示级规模。
