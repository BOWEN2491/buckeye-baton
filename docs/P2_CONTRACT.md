# P2 契约：浏览简介与 Mentor workload

2026-10-24。此文件是**待实现契约**，不是运行接口说明。P0/P1 已合入 main。唯一任务书见 [P2_AGENT_TASK.md](P2_AGENT_TASK.md)；本轮不进入 P3/P4。

## 1. 产品边界

- AI 只根据项目所有者已保存的资料生成英文浏览简介与技术/主题标签；不代写经历、成果、问题答案或 Mentor 意见，不访问代码/材料链接。
- 保留 Project.summary、tags、reflection 与现有编辑流程。AI 草稿不公开；所有者可修改并明确确认，确认后才在浏览卡片展示。
- 每段简介1–3句，标签1–6个；页面英文，确认内容标记 `AI-assisted · owner-reviewed`。没有有效确认内容时回退作者简介/标签，不伪装为 AI。
- Mentor workload 表示**多少个不同问题正在等该 Mentor 正式回复**，标签固定 `Awaiting reply`。不表示在线状态、能力、问题解决率或真实可用时间；不自动引荐、不排名、不加忙闲评分。
- 不增加通知、邀请、deadline排序、AI导师匹配、真实登录、部署或付费资源。

## 2. 类型与存储

新增 `src/shared/p2-types.ts`，引用现有 Project/User；P1 类型与响应含义不改变。

```ts
interface IntroductionContent { sentences: string[]; tags: string[] }
interface IntroductionDraft extends IntroductionContent {
  id: string; sourceHash: string; generatedAt: string;
}
interface PublishedIntroduction extends IntroductionContent {
  reviewedAt: string; stale: boolean;
}
interface IntroductionEditor {
  sourceHash: string;
  draft: IntroductionDraft | null;
  published: PublishedIntroduction | null;
}
interface PublishIntroductionInput extends IntroductionContent {
  draftId: string; sourceHash: string;
}
interface BrowseProject extends Project {
  introduction: PublishedIntroduction | null;
}
interface MentorWorkload { mentor: User; awaitingReply: number }
interface MentorWorkloadResult { items: MentorWorkload[]; asOf: string }
```

- 使用增量 `CREATE TABLE IF NOT EXISTS project_introductions`：projectId 为主键和 projects 外键；draft/published 为可空 JSONB。服务端保留 sourceHash、draftId、生成模型/时间、审核者/时间等来源元数据，不由客户端选择审核者或伪造模型来源。可增加更新时间。不得重建/清空原表。
- 新表只保存最新草稿与最新确认版本；不要求完整版本历史。生成新草稿不覆盖已确认版本；失败不覆盖任何已保存版本。
- `GET /api/projects` 仍返回数组，元素增量扩展为 BrowseProject，缺少简介时 introduction=null；原 Project 字段、顺序、搜索/状态筛选行为保留。不要求新增标签搜索或筛选。
- 项目详情、创建、PATCH、接棒及 RelayLink 继续使用现有 Project；无需把 AI 字段塞入 ProjectInput。首页向 ProjectCard 单独传入 introduction 即可；其他卡片可保持作者内容。
- 公共响应不得泄露草稿、提示词、凭据或内部模型元数据。不要把新表 JSON 直接 SELECT * 混入公开响应。

## 3. 状态与失效规则

sourceHash 是服务端对保存的 title、summary、courseOrClub、term、tags、status、完整 reflection 做稳定规范序列化后的 SHA-256；null 与空值规则固定。排除 updatedAt、讨论、接棒关系及 AI 自身元数据。

1. 无确认内容：浏览使用作者内容。
2. 所有者点 Generate introduction：读取保存资料，生成并校验，保存草稿；尚未影响公共卡片。
3. 所有者编辑草稿后点 Confirm for browsing：校验当前 draftId 与 sourceHash，事务中重新锁定/核对项目和草稿，再保存确认版本。
4. 若源资料在生成过程中改变，或确认时已改变，返回409 `INTRODUCTION_STALE`，不写入过时生成结果、不覆盖确认版本；提示先保存并重新生成。
5. 如果另一个标签页已经替换草稿，旧 draftId 确认返回409 `DRAFT_CONFLICT`，不能覆盖新草稿。
6. 项目后续编辑或状态改变造成 hash 不匹配：公开已确认内容仍保留存储，读取时 stale=true；**浏览回退作者内容与标签**，不继续显示过时 AI 描述。所有者看到需要重新生成的提示。不在 GET 中自动生成或写库。
7. UI 只能用已保存资料生成；有未保存项目编辑时，要求先保存或取消。AI 编辑区独立于原总结表单，避免草稿被误当项目保存。

## 4. 端点

沿用 `/api`、`x-demo-user-id` 和 `{data}`/`{error:{code,message}}`；均用英文错误。原有401/403/404/409语义保留。

| 方法/路径 | 权限/输入 | 成功 data |
|---|---|---|
| GET `/api/projects` | public；原筛选 | BrowseProject[] |
| GET `/api/projects/:id/introduction` | 项目所属 Student | IntroductionEditor |
| POST `/api/projects/:id/introduction/generate` | 项目所属 Student；空 JSON `{}` | IntroductionEditor，200 |
| PATCH `/api/projects/:id/introduction` | 项目所属 Student；PublishIntroductionInput | IntroductionEditor，200 |
| GET `/api/mentors/workload` | Staff | MentorWorkloadResult |

- 三个简介管理操作先校验身份/所有者，再检查 AI 配置或调用服务。Staff/Mentor/其他学生不能生成、查看草稿或确认。未知项目404。
- 生成端点只接受服务器保存的资料；客户端不能提交任意 prompt、URL、provider、model。确认必须基于服务器存在的真实模型草稿；不能直接发一段文本冒充模型生成。
- sentences 数组1–3项，每项trim后非空、最多280字符，总计最多600字符。每项须为一句英文句子，服务端统一使用英文句子分段校验，避免把4句塞进一个数组项绕过限制。不得只靠 CSS 隐藏多余句子。
- tags 每项trim、小写、1–32字符，禁止换行；去重后1–6项。生成和确认使用同一份 Zod 校验；不接受附加字段。用户修改时显示可见校验提示。
- 缺少凭据或模型配置：503 `AI_UNAVAILABLE`；超时：504 `AI_TIMEOUT`；拒绝/不完整/格式无效：502 `AI_INVALID_OUTPUT`；上游失败：503 `AI_UNAVAILABLE`。不把上游原始响应、key或stack传给浏览器。
- 单次生成有30秒超时；同项目禁止同时发起多次生成，重复进行中请求409 `GENERATION_IN_PROGRESS`。P2本地演示可用进程内锁，finally释放，明确不是多实例限流。禁止在等待模型时持有SQL事务或行锁；写入时短事务复核。浏览器提交中禁用，不自动重试或循环生成。
- 确认失败保留用户输入。若需重新生成覆盖未保存草稿，先提示用户；确认版本保持不变。

## 5. 模型接入与凭据边界

本任务书默认准备 OpenAI 实现路径；**尚未确认账号、模型、额度或凭据可用**。实现 Agent 开始 API 相关代码前，按其环境的凭据技能安全检查并向用户确认复用现有 key/安全创建新 key及实际 provider；不得把此任务书当作已同意复用任何秘密。provider变化需报告总控调整内部适配，不改变上述产品接口。

- 此次总控只写交接文档，不配置凭据、不调用付费模型。实际实现的必要凭据确认是低频汇报规则的例外。
- 使用服务器环境 `OPENAI_API_KEY` 和 `OPENAI_PROJECT_INTRO_MODEL`；不使用 NEXT_PUBLIC_* 暴露秘密，不硬编码未经账号验证的模型。模型须支持当前官方结构化输出；选定后记录名称和真实验证结果，不凭记忆声称“免费”。
- 不新增依赖：沿用 Node22 原生 fetch/AbortController 和现有 Zod，封装可替换 provider adapter；允许 tests 注入 mock transport，生产不得靠测试开关伪装真实 AI。
- 对已保存资料做有界、有效JSON输入（最多16000字符，必要时有序裁剪字段并注明截断）；不发送用户身份、讨论或外部链接内容。项目文字是数据，不是能覆盖系统要求的指令；输出为纯文本，不执行HTML/代码或工具调用。
- 真实调用前核实官方协议。使用 OpenAI Responses 时用其 documented structured text format，而不是混用 Chat Completions 参数；检查完成状态、拒绝及截断，再用Zod和句数校验。原生 REST 不应假设存在 SDK 专用的输出辅助字段，按真实响应结构解析。
- 每次点击最多发起一次实际请求，无自动修复重试；真实验收调用以1次成功生成并完整确认为目标，最多3次尝试，不购买额度或替用户创建收费资源。
- 无凭据环境仍须浏览、编辑、讨论、引荐和查看负载；生成显示不可用并保留原内容。mock用于自动测试；至少一次经用户授权的真实生成证据才能通过 AI 门槛。

官方依据（2026-10-24查阅）：[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) 支持结构化输出与拒绝分支；实现前重新阅读该页的当前 REST 示例。不在本文锁定未经验证的模型或价格。

## 6. Mentor workload 的唯一口径

- 遍历新版项目问题，按 P1 `threadState` 语义计算；把现有私有函数提取为共用服务端计算函数，**原工作台和新聚合调用同一实现**。
- 已引荐且 state=awaiting_reply 的不同 questionId 各计1。尚未引荐、开放讨论、旧 Lesson/referrals 不计；同一问题多次追问仍只计1。
- 首次正式回复→0；普通感谢/评论不重新入队；明确 follow_up→1；再次正式回复→0。Finished/Paused 不会自动清除待回复。
- 返回所有 role=mentor 的候选，包含0；按 name、id稳定排序，不按负载排序或推荐。asOf 是服务器生成时间，不假装实时监控。
- 学生/Mentor403，无身份401。只给 Staff 社区范围聚合；Mentor 现有个人工作台继续照常使用。
- Staff `/workspace` 新增 Mentor workload 区，每位显示 `Awaiting reply: N`、更新时刻和 Refresh；引荐表单候选也显示数量。打开引荐表单与手动Refresh时刷新，成功引荐后刷新；返回工作台重新读取。不需要定时器、WebSocket或后台服务。
- 读取失败显示 `Workload unavailable` 及Retry，不回退成0；保留已选Mentor/理由。负载不可用不阻止Staff依据原候选目录人工引荐，不自动换人。
- 继续保留 Alex/Mia/Sarah/Kevin 四个可切换演示身份。多Mentor/不同负载测试在独立测试库插入临时用户；不悄悄增加第五个身份。

## 7. 已核对的现有模式

| 位置 | 实施时复用 |
|---|---|
| src/components/ui.tsx 的 ProjectCard/Tags | 原作者内容保留，首页传入有效确认简介；无效/过时回退 |
| src/components/project-form.tsx 与项目详情 | 保留summary/tags编辑，在所有者详情新增独立AI编辑区 |
| src/server/http.ts 的 actor/ownProject/parse/json/fail | 角色、所有者、统一响应和错误 |
| src/server/relay.ts 的 threadState/threads/workbench | 保持DB微秒createdAt+id稳定顺序，共用待回复语义 |
| src/components/project-questions.tsx 的 ReferralPanel | 在真实候选上展示负载，保留409与失败输入 |
| src/components/workbench.tsx，页面 /workspace | Staff专用负载区，保留P1队列 |
| src/lib/client.ts 的 api/useResource/reload | 身份header、错误、请求隔离与刷新 |
| db/schema.sql，src/server/db.ts | 幂等增量；setup按分号拆SQL，不引入带内部分号的复杂过程 |

以上为文档发现结果，不是P2实现证据。P2新增完整契约语义需总控协调；常规内部拆文件无需逐项请示。
