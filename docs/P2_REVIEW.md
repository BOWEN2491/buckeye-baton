# P2 总控独立验收与集中返修

日期：2026-10-24。审查提交：`677a1d7ba815e1a351b473eeea4312512790eeab`，实现分支 `codex/p2-implementation`。

结论：**Changes requested；7/10（70%）**。H6与H8存在已复现问题，H3待补已有真实AI的可核对证据。代码尚未集成、不创建合并PR、不合并main、不进入P3。修复集中交付一次即可，无需重做P2。

## 独立检查

在 `C:/Users/23678/.codex/workspaces/buckeye-baton-p2-review` 检出精确提交，npm ci后独立执行。没有复制.env或使用用户key；浏览器使用本地mock，补充探针使用虚构凭据/注入transport。没有真实模型调用。

| 检查 | 结果 |
|---|---|
| npm run typecheck | 通过 |
| npm run test:backend | 7/7通过 |
| npm run build | 通过，NEXT_TELEMETRY_DISABLED=1 |
| npm run test:e2e | 原9/9通过，39.1s；next start，临时PGlite，3202/3299端口 |
| 补充后端探针 | R1/R2均复现，原测试未覆盖 |
| 补充浏览器探针 | R3复现；独立3203服务/临时PGlite，检查完已停止 |
| 桌面/390px | 已核对mock确认卡片、AI编辑区、Staff计数场景截图 |
| git diff --check / 追踪文件检查 | 通过；只追踪.env.example，未发现疑似真实sk密钥值 |

现有127.0.0.1:3000的P1服务（PID25596）未停止、重启或修改数据库。真实PostgreSQL/Neon/AWS/多实例仍Not run。

## R1：裁剪后的模型输入必须始终是有效JSON

位置：`src/server/ai.ts:42–50`，尤其最终 `return text.slice(0, MAX_INPUT)`。

合法项目中大量引号/换行等字符会在JSON序列化时扩展。逐字段缩短到120字符后仍可能超过16000；直接截断序列化文本会截断字符串/结构，违背契约的“有界、有效JSON”，并可能给模型丢失或损坏的上下文。

总控结果：`{"validProjectInput":true,"boundedLength":16000,"validJson":false}`。

复现数据（先用现有completeProject确认合法，再调用boundedInput）：

```js
const text = 'a' + '"'.repeat(9999);
const short = 'a' + '"'.repeat(159);
const source = {
  title: short, summary: text, courseOrClub: short, term: 'Autumn 2026',
  tags: ['web'], status: 'ongoing',
  reflection: {
    progress: text, outcomes: Array(30).fill(text),
    problems: Array(30).fill({title: short, assumed: text, happened: text, changed: text}),
    nextTeam: text, whyPaused: text, ifAgain: Array(30).fill(text),
    reusable: Array(30).fill({label: short, url: null})
  }
};
// completeProject.safeParse(source).success === true
JSON.parse(boundedInput(source)); // 当前抛错
```

要求：通过结构内裁剪/删减再重新JSON.stringify满足预算，不截断已序列化JSON；保留truncated标记和有效的最小项目上下文。测试包含合法最大项目、引号、反斜线、换行和Unicode；输出<=16000且JSON.parse始终通过。无需为测试调用真实模型。

## R2：上游错误形状应转换为AI错误，不能抛成数据库500

位置：`src/server/ai.ts:64–74`。当前未验证output/content为数组就调用find/some。

用注入transport返回200和下面的JSON，分别得到500 SERVER_ERROR，message为“Unable to complete request. Check server database configuration.”：

```json
{"status":"completed","output":{}}
```

```json
{"status":"completed","output":[{"type":"message","content":{}}]}
```

这不是数据库故障；契约规定拒绝/不完整/格式无效为502 AI_INVALID_OUTPUT。当前仅校验嵌套的文本JSON，漏了外层REST响应结构。

要求：外层形状、message/content、文本类型均先验证；200非JSON或JSON形状错误统一映射AI_INVALID_OUTPUT，保留既有网络/HTTP错误和超时映射。失败不改变草稿/确认版，finally释放生成锁。增加外层坏JSON、output对象、content对象、非字符串text等回归，验证一次请求、正确错误码且原数据不变。

## R3：成功引荐后刷新其他已打开候选中的负载

位置：`src/components/mentor-workload.tsx:8,66–90`、`src/components/project-questions.tsx:137,287`。每个MentorSelect维护各自useResource状态；引荐成功只reload问题列表，没有使其他已挂载候选的负载失效，正常状态下候选也没有Refresh按钮。

复现：在同一项目新增两个待引荐问题，Kevin同时打开两个引荐表单；两处Sarah均显示0；第一处引荐给Sarah成功后，第二处仍显示0，而/api/mentors/workload返回1。

总控结果：

```json
{"shownBefore":"Sarah Patel · Industry mentor · Product engineer · Awaiting reply: 0","shownAfter":"Sarah Patel · Industry mentor · Product engineer · Awaiting reply: 0","actualAwaitingReply":1,"hasCandidateRefresh":0}
```

要求：引荐成功使同页已打开候选刷新到最新数量（共享刷新状态、父级协调或明确失效事件均可），并提供候选的手动Refresh。刷新/失败不能重置选中Mentor与理由；失败不能把数量改成0，仍能人工引荐。增加同时打开两个表单的浏览器测试，验证第二处0→1及刷新失败/重试、输入保留。不要引入新依赖、全局定时轮询或自动分配。

## E1：补交已经完成的真实AI证据（H3）

报告描述两次真实调用及成功确认，已记录为实现方证据，**没有否定调用成功**。但报告的本机截图路径在总控环境不存在，D:/Codes/Buckeye-baton也不存在；总控不能访问其临时真实AI数据库，当前只能看到报告中的数量/标签摘要。

请让用户转交已经保存的 `real-ai-browse-card.png`，并提供脱敏的小段结果：实际两句文字、三标签、provider/model、generate/confirm成功状态、确认前后可见性及原文不变的校验。可附现有截图或可访问附件；不要提交.env、key、Authorization、完整请求日志或真实个人资料。**不要求新增真实调用，也不要求重新配置凭据。** 若原证据已清理，先说明再决定后续，不擅自追加付费调用。

## 门槛状态

| 门槛 | 当前结果 |
|---|---|
| H1 增量迁移/历史保留 | 通过 |
| H2 所有者权限/草稿隔离 | 通过 |
| H3 真实AI证据 | 待补E1，暂不计分 |
| H4 编辑确认/浏览持久/原文保留 | 通过（独立mock验证） |
| H5 过时/草稿冲突保护 | 通过 |
| H6 AI失败/有界有效输入 | 未通过：R1/R2 |
| H7 负载口径 | 通过 |
| H8 Staff负载刷新与失败交互 | 未通过：R3 |
| H9 P0/P1回归 | 通过 |
| H10 构建/原测试/响应式/控制台 | 通过；新增缺口单列H6/H8，不重复扣分 |

总控截图位于 `C:/Users/23678/AppData/Local/Temp/buckeye-baton-coordinator-p2-677a1d7/`（不提交），包含stale-referral-count.png、introduction-editor-mobile.png、staff-workload-desktop/mobile.png等。原实现新增OPENAI_BASE_URL限服务器环境、默认官方地址并用于本地mock，未改变公共契约，本次接受为内部适配细节。

## 一次性返修交接

继续原codex/p2-implementation，不重写、不改main、不进入P3。从远端读本文件，修R1–R3并加回归；更新P2_REPORT说明返修、真实证据和Not run。最终代码上重跑typecheck/backend/build/e2e，push后使用原READY短块一次回传，并列出“R1/R2/R3已修复，E1附件/脱敏结果”。现有3000服务及用户数据继续保留。
