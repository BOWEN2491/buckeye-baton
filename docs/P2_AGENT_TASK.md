# P2 单 Agent 全栈任务书

2026-10-24。一个 Agent 连续完成 P2，当前总控对话独立验收。**正常只在全部实现、自测和推送后汇报一次。** P1 已通过用户产品验收并合入 main；本文件不是P2完成证明。

## 1. 仓库、分支与环境

- 仓库：https://github.com/BOWEN2491/buckeye-baton
- 协调基线：origin/codex/p2-integration（从已合入P1的main准备）。
- 实现分支：codex/p2-implementation。使用自己的克隆目录；先检查git status、保留未提交工作、fetch，再建分支；若分支已存在，检查后继续，不reset或强推。
- 不在总控目录 `C:/Users/23678/.codex/workspaces/buckeye-baton` 实现、不改main、不重建总控.next、不使用其.data。不要停止/覆盖任何已有服务，特别是当前127.0.0.1:3000的P1产品预览。
- Node22、现有Next.js/TS/Zod/pg/PGlite依赖，产品文案全部英文。独立预览/测试用空闲端口和临时SQL目录，不复制用户数据库当测试库。

先读 AGENTS.md、PROJECT_CONTEXT.md、DECISIONS.md、project-docs/index.html、docs/EXECUTION_ROADMAP.md、**docs/P2_CONTRACT.md**、docs/API_CONTRACT.md、docs/P1_ACCEPTANCE.md。P2_CONTRACT 是本轮类型/API/规则依据，旧P1任务书仅为历史交付参考。

## 2. 连续实施顺序

### Phase 0：发现与必要凭据确认

按P2_CONTRACT第7节读取实际模式与官方结构化输出文档，记录真实支持的API；不从记忆拼凑方法或混用协议。先安全处理用户对provider与凭据复用/创建的决定；不得打印、要求粘贴或擅自复制key。按环境可用的安全凭据技能执行，用户选择是API相关实现前置条件。此项只做必要交互，不把总控任务书误当凭据授权。

同时确认当前端口、独立数据目录和保留四身份的约束。无需把类型单独交付给总控，也不等待前后端同步。

### Phase 1：类型、增量存储和原有状态复用

实现 src/shared/p2-types.ts；独立保存AI草稿/确认版本，保留所有旧项目、summary/tags/reflection及P1记录。共用threadState语义，新增Staff负载读取。验证重复迁移、未引荐/开放讨论排除、0值Mentor、追问/回复与项目状态的计数。

### Phase 2：真实AI适配与所有者编辑确认

实现契约端点、schema/句数/标签校验、sourceHash、草稿冲突与过时处理。provider等待期间不占SQL事务；失败保留原版本。实现所有者生成、编辑及确认区，确认前不公开，源资料变更后浏览回退。GET与构建不调用模型；不新增依赖或AI SDK。

### Phase 3：浏览卡片与Staff负载交互

正式首页使用有效确认的简介/标签，原始详情与原编辑保持；无AI时回退作者内容。Staff工作台和引荐候选展示Awaiting reply数量、更新时间和刷新，失败不伪装0、不阻止人工引荐。沿用现有视觉和移动布局，不重做整站。

### Phase 4：验证、文档与交付

测试mock成功/失败、真实AI一次、四身份回归、390px和生产启动；更新运行接口及报告。全部完成后提交、push并给出一次READY短块。遇到必须由用户/总控决定的阻塞才提前BLOCKED；不要每完成一层就结束任务。

## 3. 必须交付

1. 原文保留、真实AI生成1–3句与1–6标签、所有者修改确认、草稿不可公开。
2. 确认版本持久化；过时/竞争/错误处理；无AI配置或上游失败时原功能可用。
3. Staff按Mentor查看待回复问题数量，引荐候选也可看；与P1个人工作台口径一致。
4. 原有搜索、三状态编辑、接棒幂等、平铺讨论、多轮引荐回复、身份回首页与旧采用410均不退化。
5. 真实测试证据、docs/P2_REPORT.md，以及docs/API_CONTRACT.md里的已实现接口说明。

不做P3/P4、AI导师推荐、自动引荐/通知、忙闲等级、真实登录、上线、共同所有者或新增可切换演示身份。

## 4. 权限与改动范围

可修改本轮必要 src/db/scripts/tests、.env.example的**变量名/空值注释**、docs/API_CONTRACT.md和docs/P2_REPORT.md。provider/API key只存在用户确认的忽略文件或环境，不能进客户端、报告、截图或Git。

冻结P2_CONTRACT、总控进度台账、依赖和main不自行变更。契约/依赖/provider改变、真实权限问题报告总控；普通内部模块拆分不需审批。

## 5. 验证与十个门槛

每项须经总控独立核验才计10%，worker自报不自动计分。任务书准备、mock通过、API key存在都不代表真实AI门槛已过。

| 门槛 | 必须证明 |
|---|---|
| H1 | 增量迁移/重复seed/重启保留旧项目与全部P1关系、讨论、引荐 |
| H2 | 仅所有者生成/读取草稿/确认，其他角色拒绝，公开列表无草稿/秘密 |
| H3 | 经用户授权的真实模型生成与确认一次；1–3句、1–6标签、内容不编造成果；报告真实provider/model |
| H4 | 所有者可编辑确认，首页刷新持久；summary/tags/reflection不被覆盖 |
| H5 | 项目编辑/状态改变使旧简介失效，生成中编辑和旧draftId确认409且不覆盖新内容 |
| H6 | 缺配置、超时、拒绝、坏输出/上游失败有明确反馈和回退；GET不调用AI，重复点击无并发请求 |
| H7 | 不同问题计数，与P1相同追问/回复顺序；0值、普通评论、开放讨论、旧记录和项目状态正确 |
| H8 | Staff工作台/引荐候选显示一致数量、刷新及Unavailable/Retry；保留人工选择和草稿理由 |
| H9 | 原有P0/P1完整四身份主线与权限、持久化、历史和旧410回归通过 |
| H10 | typecheck/backend/build/start/e2e通过，桌面/390px和加载/空/失败/成功可用，无意外浏览器错误 |

命令：npm run typecheck、npm run test:backend、npm run build、npm run test:e2e；若本机需要可设NEXT_TELEMETRY_DISABLED=1，报告实际环境。新增后端测试须接入现有test:backend入口，不能只新增文件而没运行。

- 自动测试用隔离SQL与注入mock transport，默认不消耗模型额度。至少一次授权真实调用证明H3，记录成功状态、模型、约束检查与确认/读取结果；不要提交原始请求日志或秘密。最多3次真实验收尝试，无自动重试。
- AI浏览主线：Alex保存项目 → 生成 → 草稿不改变公共卡片 → 修改确认 → Mia浏览 → Alex修改资料 → 旧简介回退 → 重新生成/确认。mock可覆盖完整复杂边界，真实调用覆盖至少一轮生成到确认。
- 负载主线：Kevin查看Sarah的N → 引荐一问题变N+1 → Sarah正式回复回N → Mia感谢不变 → 明确追问变N+1 → Sarah再回复回N；多条追问不重复计数，项目Finished/Paused不自动清空。
- 错误主线：401/403/404/409、注入上游失败/拒绝/坏JSON/超时、负载接口失败、输入保留、旧tab草稿冲突。坏输入不得触发真实请求。
- 无法运行的检查写Not run及原因，mock明确标mock。缺凭据使H3无法验证时不得宣称P2完成，用BLOCKED并说明已完成的独立部分。

## 6. 正常只回传一次

全部实现、自测和push结束后写docs/P2_REPORT.md：精确SHA/分支、实现项、实际命令/结果、mock与真实AI分开、provider/model与调用次数、截图位置、Not run/风险。不要自评“总控100%”，不要合并main或进入P3。

```text
【转交总控验收｜P2 单 Agent｜READY】
分支：codex/p2-implementation
已推送提交：<完整 SHA>
交付：AI浏览简介/标签、所有者编辑确认、Mentor Awaiting reply负载
检查：typecheck <结果>；backend <结果>；build <结果>；e2e <结果>
真实AI：<provider/model；授权真实调用次数与生成到确认结果>
详细报告：docs/P2_REPORT.md
未完成/限制：<无则写无；Not run必须列出>
当前状态：等待总控独立验收；不进入P3、不合并main
```

用户只需转交这个短块，总控自行fetch报告/代码。返修时集中修复，再用同一短块交付。

## 7. 仅真正阻塞时额外汇报

必要provider/凭据决定、契约/依赖变化、分支冲突/推送失败，或同类故障两次尝试仍无法继续时，用以下短块。不要上传key、完整.env或冗长日志；暂停依赖该决定的操作，可继续未受影响且已获授权的部分。不要把缺key做成假AI后宣称交付。

```text
【转交总控处理｜P2 单 Agent｜BLOCKED】
分支/提交：<分支及已推送SHA或未推送说明>
阻塞：<具体事项与安全错误摘要>
已尝试：<方法与结果>
需要决定：<必要问题，例如provider/安全凭据准备>
已完成/仍可继续：<不受影响的工作>
```

## 8. 启动提示词

```text
你是 Buckeye Baton 的 P2 全栈实现 Agent，请实际实施。
仓库：https://github.com/BOWEN2491/buckeye-baton
从 origin/codex/p2-integration 建立 codex/p2-implementation，使用独立克隆目录；已有工作先检查保留，不reset或强推。
先读 AGENTS.md、docs/P2_AGENT_TASK.md、docs/P2_CONTRACT.md 及任务书要求的其他文档，按其中顺序连续完成整个P2，不只输出计划。
范围只有AI浏览简介/标签的生成、所有者编辑确认与回退，以及Staff看到的Mentor Awaiting reply负载。保留P0/P1与全部数据，文案英文，不新增依赖，不进入P3/P4，不合并main。
开始API相关工作前按凭据技能安全确认provider及复用/创建key，不打印或要求我粘贴秘密；真实AI未验证不能当作完成。
不要改动总控目录、现有3000服务或其数据库，测试使用独立端口/临时SQL。
正常只在全部实现、自测、推送后输出任务书的READY短块；详细报告写docs/P2_REPORT.md。必要凭据决定或真正阻塞才提前用BLOCKED。完成后等总控独立验收。
```
