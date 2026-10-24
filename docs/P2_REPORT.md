# P2 实现报告（单 Agent 全栈）

2026-10-24 · 分支 `codex/p2-implementation`（基线 `origin/codex/p2-integration` @ 9d2ccfa）· 契约 `docs/P2_CONTRACT.md`
最终提交 SHA 见 READY 短块（本报告随该提交一起推送）。本报告是实现方自测，**不等于总控验收通过**，不给总体进度计分。

## 返修（依据 docs/P2_REVIEW.md，审查提交 677a1d7）

| 项 | 修复 | 回归测试 |
|---|---|---|
| R1 裁剪后的输入必须是有效 JSON | `boundedInput`（`src/server/ai.ts`）改为在结构内按码点裁剪字符串并缩短列表，每轮重新 `JSON.stringify`；仍超预算时退回最小上下文（title/status/tags）。不再截断已序列化的文本，保留 `truncated` 标记，不拆分代理对 | 后端用例 “bounded model input stays valid JSON…”：先用 completeProject 确认合法，再以最大项目覆盖引号、反斜线、换行、Unicode 和混合字符，验证 ≤16000、`JSON.parse` 通过、保留 title/status、无孤立代理；用总控复现数据（引号）在旧代码上失败，新代码通过 |
| R2 坏的上游外层形状必须返回 502 而不是 500 | HTTP 200 先读 text，再由 `outputJson` 逐层校验：body 是对象、`status==='completed'`、output 是数组、message.content 是对象数组、无 refusal、`output_text.text` 是字符串，任何不符都返回 502 `AI_INVALID_OUTPUT`。网络、HTTP 和超时的错误映射不变 | 新增 7 个注入用例：200 非 JSON、output 为对象、content 为对象、text 非字符串、缺 text、null 项、数组 body。每例只发一次请求、返回 502、草稿和确认版不变；最后再生成成功一次，证明生成锁已释放。旧代码下该测试失败 |
| R3 引荐后其他已打开候选的负载不刷新 | `mentor-workload.tsx` 增加页面内失效事件 `invalidateMentorWorkload()`，所有已挂载的负载视图（各个候选列表和工作台面板）收到后重新读取。引荐成功后触发该事件。候选区新增 “Refresh counts” 按钮。刷新或失败都不重置已选 Mentor 和理由，失败时显示 Unavailable/Retry，不显示 0，仍可人工引荐。无新依赖、无定时轮询 | 浏览器用例 “a referral refreshes … other open referral forms”：两个表单同时打开 → 第一处引荐 Sarah 后，第二处从 N 变为 N+1，与 API 一致，输入保留 → 手动刷新失败显示 Unavailable 且不显示数量 → Retry 恢复 → 第二处仍能引荐 → 工作台显示 N+2。临时去掉失效调用后该用例失败，重现了总控的 0 |
| E1 真实 AI 证据 | 补交已有截图 `docs/evidence/p2-real-ai-browse-card.png`，以及脱敏结果 `docs/evidence/P2_REAL_AI_RESULT.md`（两句原文、三个标签、provider/model、generate/confirm 状态、确认前后可见性、原文不变）。**没有新增真实调用**，也不提供任何凭据 | — |

## 实现项

- **类型与校验**：`src/shared/p2-types.ts` 按契约实现。`src/shared/p2-validation.ts` 是同一份 Zod 校验，模型输出、所有者确认和前端编辑都用它：1–3 句，每项用 `Intl.Segmenter` 判定恰好一句，≤280 字符，总计 ≤600；标签 trim、转小写，1–32 字符，不含换行，去重后 1–6 个；拒绝附加字段。
- **增量存储**：`project_introductions`（projectId 为主键和外键，draft/published 为 JSONB，带 updatedAt），只保存最新草稿和最新确认版本。草稿和确认版本里有 model、reviewerId、draftId 等来源元数据，但不出现在公开响应中。原有表和数据不动。
- **sourceHash**：对 title、summary、courseOrClub、term、tags、status、reflection 做键排序后序列化，再取 SHA-256；null 保持为 null，不包含 updatedAt、讨论、关系和 AI 元数据。
- **接口**（`src/server/introductions.ts`、`src/server/ai.ts`）：生成、读取、确认都只限所属学生。
  - 检查顺序：先身份、项目和所有者，再检查输入，最后检查 AI 配置。
  - 生成请求体只接受 `{}`；同一项目同时只能有一次生成（进程内锁，finally 释放，不是多实例限流）。
  - 等待模型时不持有 SQL 事务；模型返回后用短事务复核 hash，有变化返回 409 `INTRODUCTION_STALE`，不写入。
  - 确认时锁定项目行和简介行：draftId 不符返回 409 `DRAFT_CONFLICT`，hash 不符返回 409 `INTRODUCTION_STALE`。
  - 错误映射：缺配置或上游失败 503 `AI_UNAVAILABLE`，超时 504 `AI_TIMEOUT`，拒绝、未完成、坏 JSON 或校验失败 502 `AI_INVALID_OUTPUT`。
- **OpenAI 适配**：用原生 fetch 调用 Responses API，`text.format` 为 `json_schema` 加 `strict:true`，并设 `store:false`，没有新增依赖或 SDK。
  - 依据 2026-10-24 查阅的官方 Structured Outputs 文档：schema 用 minItems/maxItems（strict 模式不支持 maxLength，所以长度由 Zod 校验）。
  - 解析步骤：先确认 `status === 'completed'`，再取 `message` 项的 `output_text`；遇到 `refusal` 内容视为无效。
  - 输入是有界 JSON（≤16000 字符，超出时逐级截断并标注 `truncated`），不发送身份、讨论或链接内容；系统提示要求把项目文字当作数据，不得编造成果。
  - 每次点击最多一次请求，无自动重试。新增可选环境变量 `OPENAI_BASE_URL`，默认是官方地址，供 Playwright 指向本地 mock。
- **浏览**：`GET /api/projects` 返回 BrowseProject[]，原字段、排序和筛选不变。首页卡片只在确认内容有效且未过时时显示简介和标签，并标注 `AI-assisted · owner-reviewed`；其他情况回退作者内容。项目详情、编辑、接棒和 RelayLink 仍用原 Project。
- **所有者 AI 编辑区**（`src/components/introduction-panel.tsx`）：独立于项目表单，编辑项目时隐藏，保存后重新加载。
  - 生成：提交中按钮禁用；覆盖未保存的草稿修改前先确认。
  - 编辑：每句一个输入框，可增删（最多 3 句）；标签逗号分隔；校验提示可见。
  - 确认：409 时保留输入，并提供 “Load the newer draft”；草稿过时时禁用确认，并提示需要重新生成。
- **Mentor workload**：`mentorWorkload` 复用 P1 的 `threads()`/`threadState`，只统计已引荐且状态为 awaiting_reply 的不同问题；返回所有 Mentor（包括 0），按 name、id 排序；仅 Staff 可读。
  - Staff 工作台新增 Mentor workload 区：显示 `Awaiting reply: N`、Updated 时间和 Refresh。
  - 引荐候选在选项中显示数量：打开表单时读取，Retry 后刷新。
  - 读取失败显示 `Workload unavailable` 和 Retry，不显示 0，保留已选 Mentor 和理由，人工引荐不受影响。
  - 演示身份仍只有四个；多 Mentor 测试只在临时测试库插入用户。

## 主要文件

`src/shared/{p2-types,p2-validation}.ts`、`db/schema.sql`、`src/server/{ai,introductions,relay,api}.ts`、`src/app/api/projects/[id]/introduction/{route,generate/route}.ts`、`src/app/api/mentors/workload/route.ts`、`src/components/{introduction-panel,mentor-workload,ui,project-questions,workbench}.tsx`、`src/app/page.tsx`、`src/app/projects/[id]/page.tsx`、`src/app/globals.css`、`.env.example`（只含变量名）、`playwright.config.ts`、`tests/p2.test.ts`（已接入 `tests/backend.test.ts`）、`tests/e2e/{workload-introductions.spec.ts,mock-openai.mjs}`、`docs/API_CONTRACT.md`。

## 测试命令与结果（Node v22.15.1，Windows，`NEXT_TELEMETRY_DISABLED=1`）

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run test:backend` | 8/8 通过（P2 三项，含 R1/R2 回归；P1 两项和 P0 三项保留） |
| `npm run build` | 通过 |
| `npm run test:e2e` | 10/10 通过（48.9s，含 R3 用例）；Playwright 启动 `next start` 生产服务器（独立临时 PGlite）和本地 mock 模型服务器，即同时确认了生产启动 |
| `git diff --check` | 通过 |

**Mock（自动测试，不消耗额度）**：后端测试注入 transport。
- 覆盖 401/403/404：Mia、Kevin、Sarah 和无身份请求都无法生成、读取或确认。
- 缺配置返回 503，且不发出请求；`{prompt}` 等附加输入返回 400，也不发出请求。
- 请求格式检查（json_schema、strict）；请求中不含身份或 key。
- 草稿不公开；确认后公开字段只有 sentences/tags/reviewedAt/stale；确认后 summary/tags/reflection 不变。
- 409 场景：旧 draftId 返回 DRAFT_CONFLICT；项目编辑或状态改变后返回 stale；生成过程中编辑项目返回 409 且不写草稿。
- 上游失败：500、401、网络错误、拒绝、incomplete、坏 JSON、4 句、单项塞多句、附加字段、无 message，都返回对应错误且只调用一次；超时返回 504。
- 并发生成返回 409，且只有一次调用；输入截断到 ≤16000。
- 重复 setup/seed 和重启后数据保留。

负载测试：0 值、多 Mentor 排序；引荐 +1；正式回复 −1；三种身份的普通评论不变；两次追问只计 1；开放讨论和未引荐的问题不计；旧 lesson referrals 不计；项目 Paused 后不清空；与 Sarah 个人工作台数量一致；重启后保持。

浏览器（mock 模型）：
- AI 主线：Alex 生成失败（503 提示，原内容保留）→ 生成（重复点击只发一次 POST）→ 草稿不影响公共卡片 → 违规编辑看到提示且不发送请求 → 修改并确认 → Mia 刷新后看到确认版卡片和标签，详情仍为原文且没有编辑区，公开 JSON 不含草稿或模型名。
- 冲突与过时：第二标签页替换草稿后，旧标签页确认返回 409，输入保留，可加载新草稿 → Alex 编辑项目后卡片回退作者内容，过时草稿不能确认 → 重新生成并确认。
- 负载主线：Kevin 记下 N → 读取失败时 Unavailable/Retry，选择和理由保留 → 引荐后 N+1 → Sarah 回复后 N → Mia 感谢后仍 N → 两次追问后 N+1 → 工作台 Refresh 失败后 Retry → Sarah 再回复后 N。
- 布局：390px 下首页、编辑区、Staff 工作台无横向溢出；无意外 console 或页面错误。P0/P1 的 7 项浏览器回归全部保留并通过。

## 真实 AI（H3）

- Provider：OpenAI Responses API（官方 `https://api.openai.com/v1`，未设 `OPENAI_BASE_URL`）。模型：**`gpt-6-luna`**。用户选择 OpenAI，并自行把 key 写入已忽略的 `.env.local`；实现方只检查变量是否存在，没有读取、打印或复制 key。
- 授权真实生成共 **2 次**（上限 3 次），都在独立生产服务器 `127.0.0.1:3300` 和临时 PGlite 上进行，没有使用 3000 服务或用户数据库。
  1. 第 1 次：HTTP 404，界面返回 503 `AI_UNAVAILABLE`，没有写入。原因是配置的模型名是 `gpt-6-Luna`，而 OpenAI 模型 ID 区分大小写。随后用 key 调用免费的 `/v1/models` 列表（不生成内容），确认账号可用的 ID 为 `gpt-6-luna`，只修正了 `.env.local` 的模型行。
  2. 第 2 次：**成功**，200，耗时 2.5s。项目是 `project-v2-paused`，身份 Alex。返回 2 句（每项都是一句）和 3 个标签：notifications、web、consent。内容只复述已保存的进展和暂停原因，没有编造成果。确认前公共卡片没有简介；按原样确认后返回 200，`/api/projects` 中出现 stale=false 的简介，与草稿一致；作者 summary 和 reflection 未改变；公开列表不含 draftId 或模型名。
- 截图与脱敏结果已提交：[docs/evidence/p2-real-ai-browse-card.png](evidence/p2-real-ai-browse-card.png)、[docs/evidence/P2_REAL_AI_RESULT.md](evidence/P2_REAL_AI_RESULT.md)。没有保存原始请求或响应日志，报告和截图中没有 key。

## 截图位置

真实 AI 截图已提交到 `docs/evidence/`。其余为 mock 测试截图，存放在本机临时目录 `C:/Users/23678/AppData/Local/Temp/claude/D--Codes-Buckeye-baton/0ed38a91-4ca2-4b43-9f37-f40b93bd7c18/scratchpad/qa-p2/` 和 `qa-p2-fix/`，未提交：introduction-editor-desktop/mobile、browse-card-confirmed-desktop、browse-mobile、referral-candidates-desktop、staff-workload-desktop/mobile、real-ai-browse-card，以及沿用的 P0/P1 截图。

## Not run、限制与风险

- 真实 PostgreSQL、Neon、AWS 和多实例：Not run。生成锁是进程内的；PGlite 单连接串行执行事务，所以竞争测试验证的是逻辑路径。
- 真实 AI 只覆盖一轮生成到确认。超时、拒绝、坏输出等真实上游异常只用 mock 验证过，没有刻意在真实服务上触发。
- 浏览器的 AI 流程用的是本地 mock 模型（通过 `OPENAI_BASE_URL` 指向），不是真实模型；真实模型验证见上一节。
- 新增可选环境变量 `OPENAI_BASE_URL` 是内部适配细节，产品接口没有变化；如果总控认为需要记入契约，请协调。
- 确认后最新草稿仍显示在所有者编辑区（契约只要求保存最新草稿），不会公开。
