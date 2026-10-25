# P3 实现报告（单 Agent 全栈）

2026-10-24 · 分支 `codex/p3-implementation` · 基线 `origin/codex/p3-integration` @ `b1563aa`（已包含 P2 最终 `d97920f` 和 P3 冻结文档）· 契约 `docs/P3_CONTRACT.md`
最终提交 SHA 见 READY 短块（本报告随该提交一起推送）。本报告是实现方自测，**不等于总控验收通过**，不给总体进度计分。

## 返修 R1（依据 docs/P3_REVIEW.md，审查提交 2977e4d）

- **问题**：跨问题同分并列时，比较的是转成毫秒 ISO 后的 pendingSince/createdAt，再按 id 排序。数据库时间不同、却落在同一毫秒内时，工作台 Priority 顺序和项目最高分问题的选择都会出错。
- **修复**（只改 `src/server/priority.ts` 和 `src/server/relay.ts`）：
  - 共用的 `threads()` 额外读取 `(extract(epoch FROM "createdAt") * 1000000)::bigint::text`，即问题和有效帖子的精确微秒时间，放进内部 WeakMap。公开字段、毫秒 ISO 格式和响应形状都不变。
  - 唯一的比较器 `byQuestionPriority` 依次按分数、精确 pendingSince（问题本身，或最后一条有效回复之后第一条有效追问的微秒时间）、精确 question.createdAt 比较，完全相同时才看 id。工作台 Priority 和项目最高分问题选择共用这一比较器。
  - 不新增 schema，不改 Newest/Oldest 顺序和权限，前端不参与。
- **回归**（`tests/p3.test.ts`，真实 SQL 加 handle/API，固定 asOf=2027-03-01T12:00Z）：
  - 场景 A（创建时间差 100µs、从未回复，均 30 分）：oldest 和 priority 都返回 `[z-earlier, a-later]`，项目原因指向 z-earlier；公开 createdAt 仍是毫秒 ISO，响应中不出现内部键。
  - 场景 B（创建顺序与等待顺序相反，追问时间差 100µs）：Sarah 的 priority 队列和 Staff 的 Referred 都是 `[b-a-later, b-z-earlier]`，oldest 仍按创建顺序，项目原因指向 b-a-later。
  - 精确 pendingSince 相同时按精确 createdAt 决定；完整时刻也相同时按 id 升序。
  - **在 2977e4d 的 priority.ts/relay.ts 上，场景 A、B 两项都失败**（A 得到 a-later，B 得到 b-z-earlier）；修复后通过。
- **文案**：ReplyDateEditor 提示改为 “Changing the date may change its priority, but does not change its reply status or mentor assignment.”，业务规则不变。

## 交付项

- **类型**：`src/shared/p3-types.ts` 按契约实现，复用 BrowseProject/QuestionThread/Workbench，不改 ProjectInput，也不影响 AI sourceHash。
- **唯一规则模块** `src/server/priority.ts`：
  - pendingSince、问题分、项目分（只取单个最高分问题）、原因、稳定并列和所有者建议都只在这里计算，前端不复制任何规则。
  - 每个请求只取一次 `now()` 作为 asOf。测试通过 `setClock` 在服务端注入固定时钟；生产 API 不接受客户端传入的 now/asOf。
- **数据来源**：`src/server/relay.ts` 导出共用 `threads()`（P1 状态，排除 deletedAt，SQL `createdAt,id` 顺序），没有另写状态机。
  - 一次批量读取后续关系计数（计数覆盖全部关系，不受筛选影响）和全部项目线程，没有逐卡片查询。
  - 不新增 schema，不保存分数，GET 不写库，不调用 AI，不发通知。
- **API**：
  - `GET /api/projects?sort=recommended|newest`：不传 sort 时保持原形状；recommended 在 Newest 顺序（DB 精度的 createdAt desc、id asc）上按分数做稳定排序。
  - `GET /api/workbench?sort=priority|oldest`：仍只有四个数组键；非待处理条目 priority=null，排在待处理之后。
  - `GET /api/projects/:id/priority`。
  - `PATCH /api/project-questions/:id`：只有提问者可改；严格只接受 `{dueAt}`；未来 UTC 时间或 null；在短事务内更新。
  - 不支持的 sort（包括空字符串）返回 400。项目详情仍为四键，问题响应仍为 QuestionThread。
- **页面**：
  - Explore：Recommended（默认）/Newest，可与搜索、状态筛选组合。卡片显示 “Why recommended”（前两项原因，其余可展开，带问题锚点）、0 分卡片显示 “No priority boost”、Updated/Refresh，以及 “How priority works” 规则说明。
  - 工作台：Priority（默认）/Oldest first，分组和角色权限不变，显示等待起点与原因、Updated/Refresh；加载失败显示 Retry。
  - 项目页 “Recommended because” 面板：与卡片原因一致，显示 Updated/Refresh；失败时 Unavailable/Retry。仅项目所有者看到 Owner advice：improve_handoff 打开既有 Edit project；其他建议链接到对应问题；没有建议时显示空状态。
  - 问题旁显示该问题的优先原因。只有提问者看到 “Edit reply date”（Save date / Remove date / Cancel），失败保留输入。
  - 讨论、引荐、删除和日期修改成功后，通过页面内失效事件同步刷新 priority；项目编辑或状态改变后面板重新挂载。
  - 切换身份仍回到未筛选首页，排序恢复默认，main 以身份为 key 重新挂载，不会显示上一个身份的数据或按钮。
- **e2e 测试数据**：`tests/e2e/p3-fixtures.ts` 只在 Playwright 的 `next start` 之前运行，并检查 PGLITE_DATA_DIR 必须是本次 e2e 的临时库。它写入一个 40 天前发布、无人接棒的虚构 Paused 项目，以及一个已等待 10 天的问题（相对当前时间）。生产 seed 不变，3001 等现有库重启不会被插入数据。

## 公式与来源（与契约一致）

- 无人接棒：当前 Paused 且没有任何 `project_relations.sourceProjectId` 指向它。分数 `min(20, 5 × floor(发布小时/168))`，文案 `Shared N days ago · no pickup yet`，基于 createdAt，不表述为暂停时长；未来的 createdAt 按 0 计。
- 问题：状态必须是 `needs_referral` 或 `awaiting_reply`。分数 `min(30, 5 × floor(等待小时/24))`，再加期限分：dueAt ≤ asOf 加 50（`Reply date passed`），24 小时内加 35，72 小时内加 20，三档互斥。null 期限不加分；discussion/replied 状态的 priority 为 null。
- 并列比较使用数据库微秒时间（R1）。pendingSince：没有有效正式回复时取 question.createdAt（引荐不重置）；否则取最后一条有效正式回复之后的第一条有效 follow_up。连续追问不重置，普通评论和日期修改不影响。
- 项目分：无人接棒分加上单个最高问题的分数（最高 100）。最高分问题并列时按 pendingSince、createdAt、id 依次决定。原因顺序为 no_pickup、waiting、期限，points 之和等于 score。
- 建议：improve_handoff（无人接棒且发布 ≥14 天）、narrow_question（等待 ≥3 天）、review_reply_date（dueAt ≤ asOf+24h），不出现概率或保证类措辞。

## 命令与结果（Node v22.15.1，Windows，`NEXT_TELEMETRY_DISABLED=1`，在自己的克隆目录 `D:/Codes/Buckeye-baton` 运行）

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run test:backend` | **13/13** 通过（P3 四项，含 R1 场景 A、B；P0 三项、P1 两项、P2 三项、评论删除一项保留） |
| `npm run build` | 通过 |
| `npm run test:e2e`（`E2E_PORT=3410`，mock 端口 3509） | **14/14** 通过（约 1.1 分钟，R1 修复后重跑）；Playwright 启动 `next start` 生产服务器、独立临时 PGlite 和本地 mock 模型服务器，即同时确认了生产启动 |
| `git diff --check` | 通过 |

### 固定时钟后端证据（`tests/p3.test.ts`，asOf = 2027-03-01T12:00Z，隔离 PGlite，走真实 API handler）

- J1：发布时间差 1 秒不满 7 天、正好 7 天、13 天、14 天、28 天、200 天和未来 createdAt，分别得 0/5/5/10/20/20/0；Finished、Ongoing 或已有后续项目时为 0；文案中没有 “paused for”。
- J2：引荐不重置 pendingSince；正式回复后为 null；感谢评论不影响；两次追问只取第一条；删除第一条追问后改取第二条；删除正式回复后回到 createdAt，得 30 分。
- J3：等待 23h59m、1、3、6、9 天，分别得 0/5/15/30/30；期限恰好等于 asOf、已过期、正好 24h、24h+1s、正好 72h、72h+1s 分别得 50/50/35/20/20/0；等待与期限可叠加（55）；所有原因之和等于总分。
- J4：项目只取最高问题（55，不是累加）；并列时依次按 pendingSince、createdAt、id；Paused 加最高问题得 100，原因顺序正确。
  - Recommended 包含全部项目（含 0 分），0 分项目保持 Newest 顺序；Newest 与不传 sort 一致，相同 createdAt 时按 id 排序。
  - 先筛选、后计数：筛选掉后续项目后，来源项目仍得 0。
- J5：sort=oldest 与不传 sort 的响应完全相等，且不含 priority；priority 只有四键，分组成员相同；待处理在前、replied 在后且为 null；Sarah 只看到自己的问题；Mentor workload 不变；401、403 和非法 sort 400 都覆盖。
- J6：401、404；Alex（项目所有者）、Kevin、Sarah 都是 403；空对象、额外字段、过去时间、当前时间、非 ISO、纯日期都是 400；合法未来日期和 null 返回 200 和 QuestionThread（无 priority 字段）。修改后问题其他字段、projects、posts、AI sourceHash 和 workload 都不变，pendingSince 也不变。
- 重复 GET 三轮后 6 张表完全一致（GET 不写库）；重复 setup/seed 并重启后 Recommended 结果相同。

### 浏览器证据（`tests/e2e/workbench-priority.spec.ts` + 全部既有回归）

1. Explore：fixture 项目排第一，原因为 “+20 Shared 40 days ago · no pickup yet” 和 “+30 Waiting 10 days for a reply”，可链接到问题；显示 Updated；有 0 分卡片。切 Newest 后卡片数相同、没有原因；搜索加 Paused 筛选，再切回 Recommended；Finished 筛选显示空状态；切换身份后回到默认排序；390px 无溢出；generate 请求 0 次。
2. Kevin 工作台：Priority 下 12 小时内到期的问题（+35）排在等待 10 天（+30）之前；切 Oldest first 后顺序反过来、没有原因，条目集合相同。
3. Mia 修改日期：503 时保留输入，重试后显示 “Reply date updated.”；问题和面板都出现 “Reply date within 3 days”，刷新后保持。Alex 作为项目所有者看不到修改按钮，API 返回 403；他看到 Owner advice，按钮能打开 Edit project。
4. 引荐 → Sarah 回复（问题 priority 消失，项目分 70→20）→ 感谢（不变）→ 追问（等待从追问开始，项目 40）→ 再回复（20）→ Alex 作为所有者删除最新回复（40，回到追问状态）。每一步 Sarah 的 workload、priority 工作台和普通工作台数量都一致；Sarah 只看到自己的队列。
5. Mia 接棒后，来源项目的 no pickup 原因消失，Picked up by (1)；暂停总结和问题历史保留；首页卡片也不再显示。之后 390px 下检查项目页和 Staff 工作台。
6. 失败与重试：priority 面板 Unavailable/Retry，工作台加载失败 Retry。
7. 既有回归：P0 五项、评论删除一项、P1 两项、P2 三项（AI 生成、确认、过时回退、Staff 负载、R3 多表单刷新）全部通过。

截图存放在本机临时目录 `C:/Users/23678/AppData/Local/Temp/claude/D--Codes-Buckeye-baton/0ed38a91-4ca2-4b43-9f37-f40b93bd7c18/scratchpad/qa-p3/`，未提交：explore-recommended-desktop/mobile、staff-workbench-priority-desktop/mobile、mentor-workbench-priority-desktop、project-priority-owner-desktop、project-priority-mobile，以及既有 P0/P1/P2 截图。

## 模型与环境

- 本轮真实模型调用 **0 次**。P2 浏览器回归使用既有本地 mock，没有读取或复制任何 `.env`/key；旧的真实 AI 证据没有改动。
- 只用了自己的克隆目录、构建目录、端口 3410/3509 和临时 PGlite。没有触碰总控目录、3000/3001 服务、`buckeye-baton-comment-deletion` 或 `buckeye-baton-p2-review`；没有改 main，没有合并 PR #3。

## Not run、限制与风险

- 真实 PostgreSQL、Neon、AWS、公网和多实例：Not run。本地只用 PGlite（单连接串行）。
- 首版取舍按契约执行：没有 pausedAt，无人接棒按 createdAt 计算共享年龄，所以早发布、刚改为 Paused 的项目会立即获得年龄分；日期编辑以最后一次合法保存为准，没有版本锁。
- 浏览器测试的相对日期由 fixture 生成，并避开边界（40 天、10 天、12 小时、+2 个本地日）；精确边界由固定时钟的后端测试覆盖。
- 工作台的 Updated 时间取自响应中任一条 priority 的 asOf；Oldest first 不带 asOf，只提供 Refresh。
