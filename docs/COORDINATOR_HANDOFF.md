# Buckeye Baton — 新账号主控交接

**当前入口已更新：以下主体保留为P2结束时的历史快照，不能作为运行/阶段现况。** P3含产品反馈与Detail38e4901已通过用户验收，当前准备P4（应用未实现，独立0/10）。请先读PROJECT_CONTEXT.md、EXECUTION_ROADMAP.md和P4_AGENT_TASK/P4_CONTRACT。当前3000为p3-detail应用，数据/真实配置仍在p3-review，3001已停；具体见P3_PREVIEW顶部及runtime manifest。main未获最新合并授权，原库/worktree不可清理。

更新：2026-10-24。本文供没有任何聊天历史的新 Codex 主控使用。记录经过核对的事实与已批准方向；不是实施 P3 或合并 PR 的授权。后续用户指令优先。运行进程和分支属于此时快照，操作前重新核对。

后续进展：用户已完成上下文承接，不再需要新主控启动词。本交接快照保留；P3契约和任务书随后写入P3_CONTRACT.md、P3_AGENT_TASK.md、P3_START_PROMPT.md，协调分支现为codex/p3-integration。下文“尚无任务书/规则未冻结”描述的是交接时状态，以新P3文档为当前计划；应用仍未实施/验收。

最新进展：P3最终4839e77现已总控独立验收10/10并集成协调分支（见P3_ACCEPTANCE.md），R1关闭，待用户产品验收。上段及下文是历史快照，不代表当前未实现。3000/3001仍为原P1/P2，P3用户预览未启动；main未合并、P4未开始。

## 1. 接手结论

- 用户最新确认：**P2 全部产品验收通过，包括评论删除补充**。P0/P1 已完成并合入 main；P2 总控独立验收 10/10，删除补充全量回归通过。不要重复要求用户验收已经通过的功能。
- **PR #3 仍 open、未合并**，本次没有明确合并授权。不要将“验证通过，接下来 P3”当作合并指令。可继续 P3 规划；需合并时再取得明确授权。
- **P3 未实施、尚未制定冻结契约或任务书，已验收 0 项。** 下一步先梳理 P3 范围/规则/契约/验收门槛，再像 P1/P2 一样交付一份单 Agent 全栈任务书及启动提示词。
- 用户将切换 Codex 账号，文件与 GitHub 留下，对话丢失。你是新主控；另一个由用户手动转交任务的 Agent 是实现 worker，不要自动创建聊天或给别人发消息。

## 2. 仓库与精确版本

GitHub：<https://github.com/BOWEN2491/buckeye-baton>

主控本机目录：`C:/Users/23678/.codex/workspaces/buckeye-baton`。桌面会话默认目录 `C:/Users/23678/Documents/ChatGPT/O` 不是应用仓库。旧 Downloads/D: 路径不是当前工作基线。

| 对象 | 本次交接时状态 |
|---|---|
| 当前协调分支 | `codex/p2-integration`；本文及状态同步将提交并推送在此分支 |
| 文档交接前 HEAD | `85c0c9f4ea52fdc311c3783f73de6ffe1b2d4d8e`；之后文档提交以 git log 为准 |
| P2 最终应用代码/3001运行版本 | `d97920f352072b3343d9f43b0ffdf335919642c1`，含评论删除 |
| P2 worker 最终提交 | `df5f050685482a8c479710f2a5897ce4ac36b47d`，含 R1–R3 返修和真实 AI 既有证据 |
| main / origin/main | `fab10f8d4fecdaa8a9aabcd9eb8bcce822bae88a`，含 P0/P1，不含 P2 |
| 待合并 PR | [PR #3](https://github.com/BOWEN2491/buckeye-baton/pull/3)，`codex/p2-integration` → `main` |
| 既往合并 | PR #1、#2 已按用户明确授权合并；PR #2 合并提交 `3b473deb2b01c708cac9f192663b4de1f352d4d4` |

main 是最终共享稳定基线，但目前落后于已验收 P2。**未合并前，P3 若需创建任务分支必须基于包含 d97920f 的最新 P2 集成提交，不能直接从旧 main 开发而丢掉 P2。** 不强推、不 reset 未知修改、不清理其他人的分支。账号切换后安全核对 GitHub 访问权限，凭据问题不通过输出 token 排查。

## 3. 产品定义与已固定的规则

项目名 **Buckeye Baton**，曾叫 Pass It On。Honda / HackOHI/O 2026 项目；目标是能放作品集的可运行产品。用户主要承担开发，队友负责设计、文案与试用。沟通中文，**产品页面、按钮、错误提示和新标签使用英文**。

核心：学生留下项目与经验，下一组重现、继续或改进；Staff 把合适 Mentor 带到具体问题。Project 是一次有明确目标的实践，**经验写在项目里，不恢复独立 Lesson / Add lesson to project / 逐条采用统计**。

- 角色 `student / mentor / staff`，不是 Alumni。四个虚构演示身份 Alex `student-alex`、Mia `student-mia`、Sarah `mentor-sarah`、Kevin `staff-kevin`。`x-demo-user-id` 是演示身份机制，不是真实认证；切换身份回未筛选首页。
- 状态 `ongoing / finished / paused`。所有者编辑；Finished 要有成果与给下一组建议，Paused 要有暂停原因与重做建议；切换只改变展示重点，不删除旧总结、问题、引荐和关系。
- reflection 保存 progress、outcomes、problems（assumed/happened/changed）、nextTeam、whyPaused、ifAgain、reusable。代码、演示与材料通过链接访问，不做代码 fork/在线代码编辑。
- Finished/Paused 可接棒，方式 `reproduce / continue / improve`，创建当前学生自己的新 Ongoing 项目，保留来源/后续双向关系；原项目和所有权不变；一个项目一个所有者。不自动复制他人的经验为新成果，不自动延续 Mentor。
- 学生在项目内提具体问题，**deadline 指该问题希望得到回复的日期**，不是项目截止时间。所有身份可普通评论；提问者可明确 follow_up；仅 Staff 人工引荐，一问题一条；仅被引荐 Mentor 可正式回复，多轮可继续。
- 队列按有效帖子推导：无需 Mentor → discussion；未引荐 → needs_referral；未正式回复或最新 follow_up 晚于正式回复 → awaiting_reply；否则 replied。普通评论/感谢不重新入队，Replied 不等于已解决。状态改 Finished/Paused 不自动关闭问题。
- 增量迁移保留已有数据，不重置/覆盖用户编辑。旧 Lesson 记录可内联为历史经验，旧独立页面重定向项目，旧采用写接口返回 410。

技术：Next.js 15 / React / TypeScript / Node 22 / Tailwind / pg/PostgreSQL；本地显式 PGlite 持久 SQL。页面与 API 同一应用。无真实登录、上传或公网部署。队友设计已在 `design/relay/`，`design/cards/` 参考状态布局，`design/feed/` 不是已批准实施内容。

## 4. P2 的实现与验收，避免重开历史问题

### AI 浏览简介/标签

- 原作者 summary/tags/reflection 保留；另存 AI draft/published，所有者编辑确认后公开，浏览卡最多 3 句及标签，标记 `AI-assisted · owner-reviewed`。
- sourceHash 检测源内容变化，过时版本回退作者内容；GET 不自动调用模型；权限、草稿竞争、无配置/超时/坏输出有明确处理。
- OpenAI Responses API，当前真实配置 `gpt-6-luna`；服务端可选 OPENAI_BASE_URL 供隔离测试 mock 使用。不能因测试用了 mock 就把真实预览描述为 mock。
- Staff-only Mentor workload 按不同 awaiting_reply 问题计数，标签 `Awaiting reply: N`。不是实际可用时间或能力评分；人工选择 Mentor 保留。失败显示 unavailable 而不是 0；候选手动 Refresh counts，以及同页面引荐成功刷新所有已开候选。

独立复验 df5f050：typecheck/build/start、backend **8/8**、e2e **10/10**（隔离 PGlite + mock，含 390px），H1–H10 全通过。早期 R1（截断序列化 JSON）、R2（坏 HTTP200 响应错误500）、R3（其他表单负载不刷新）均已修复并复验；`P2_REVIEW.md` 的 70% 是已关闭的历史审查，不是当前进度。

既有真实 AI 证据在 `docs/evidence/P2_REAL_AI_RESULT.md`、`docs/evidence/p2-real-ai-browse-card.png`：实现方已授权调用共两次，首次模型大小写错误404，第二次成功，生成/确认200、2句/3标签、原文不变。总控审查该证据，没有额外付费调用；不要宣称重新测过额度/模型目录或真实异常。

### 评论删除补充（用户也已通过验收）

`DELETE /api/project-posts/:id`：项目所有者可删任意项目评论，评论作者可删自己的 comment/follow_up/mentor_reply；**提问者不自动有删除他人评论的权力**。Staff/Mentor 无额外管理权。UI 需确认；服务端校验；失败保留；合法重试幂等。

增量 deletedAt/deletedBy 软删除，原正文与审计私有保留；公共讨论、工作台、负载共用过滤后的帖子流，删除回复/追问后重算队列。问题、引荐不删除，不做帖子编辑/恢复。详见 `docs/COMMENT_DELETION.md`，取代早期禁止帖子删除的条目。

最终 d97920f：typecheck、生产 build/start、backend **9/9**、e2e **11/11**，含 P0/P1/P2 与390px。使用隔离 SQL/mock，无新增真实 AI 调用。3001升级前后核对5项目/4问题/5评论与AI内容保留；这是当时数量快照，不应当作今后固定数量。用户随后确认“验证通过”。

限制仍在：**真实 PostgreSQL/Neon/AWS/公网部署/多实例未验证**；PGlite 单连接串行不证明真正并发竞争；AI生成锁进程内；真实上游异常只 mock 测试。本地产品通过不等于生产验证。

## 5. 本地服务与数据：最容易误操作的部分

以下为交接核查时快照，账号切换后先检查监听端口/PID/命令行/运行清单，不能只凭此表 kill 进程。

| 服务 | P1 保留预览 | P2 最新产品预览 |
|---|---|---|
| URL | http://127.0.0.1:3000 | http://127.0.0.1:3001 |
| PID | 25596 | 31004 |
| 实际运行 SHA | `a232252548b021dea5414d9b28192d30fcb599c3` | `d97920f352072b3343d9f43b0ffdf335919642c1` |
| 应用目录 | `C:/Users/23678/.codex/workspaces/buckeye-baton` | `C:/Users/23678/.codex/workspaces/buckeye-baton-comment-deletion` |
| DB 目录 | 主控目录的 `.data/pglite` | `C:/Users/23678/.codex/workspaces/buckeye-baton-p2-review/.data/p2-preview-df5f050` |
| 配置 | 保持原样 | `C:/Users/23678/.codex/workspaces/buckeye-baton-p2-review/.env.local` |
| 模型 | 不以此服务验收 P2 | **真实 OpenAI / gpt-6-luna，不是 mock** |

关键保护规则：

1. **主控目录虽然 checkout P2，3000 的 .next 仍是 P1 构建。不要在该目录执行 build/dev 覆盖运行中构建。** 需要验证时使用新的任务 worktree 与独立构建目录、数据库、空闲端口。
2. P2 的应用、env、DB 分别在两个 worktree 中。`buckeye-baton-p2-review` 虽为 detached HEAD，仍持有真实配置和活跃 DB；**不能当作废弃审查目录清理**。`buckeye-baton-comment-deletion` 正运行3001，也不能清理。
3. PGlite 一个目录只供一个进程。不要拿当前 DB 跑测试、seed/reset 或启动第二实例，不覆盖两边数据。`.env.local`、`.data`、备份不在 Git，不能指望换账号后重新 clone 会恢复。
4. P2 env 中 PGLITE_DATA_DIR 是相对路径；如从 comment-deletion 目录重启，必须覆盖为上表**绝对的原 P2 DB 路径**，避免误建空库。已有真实 key 由用户填写，不打印、不提交、不要求在聊天中粘贴。此次交接与 P3 规则规划都不需要真实调用。
5. 3001 BuildID：`RMfa98QCWKno4xqln7V8i`。运行清单在 comment-deletion 与 p2-review 的 `.data/p2-preview-runtime.json`；P1清单在主控 `.data/p1-preview-runtime.json`。其路径和进程状态优先于推断，修改前检查。升级前备份在 `C:/Users/23678/AppData/Local/Temp/buckeye-baton-before-delete-migration-be1896cb39ef43d9b2cd5199318c1749`。

如服务仍在，不重启。如果未来用户要求恢复而服务已退出：先看安全运行清单和 README，使用 Node22，从对应应用目录执行 next start，加载原配置，显式指定正确DB与空闲端口。P2可用 Node `--env-file=<上述.env.local>` 加载，不读取输出密钥；不要仅依赖 next 自动搜索 env（其位于另一个目录）。不在此次交接中自动恢复/变更服务。

本机已知运行工具路径（先检查仍存在）：Node22 bin `C:/Users/23678/.codex/runtimes/pass-it-on-node22/node_modules/node/bin`，npm bin `C:/Users/23678/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`。构建设置 `NEXT_TELEMETRY_DISABLED=1`，规避此前 Windows 遥测写入 EXDEV。

其他 worktree：`buckeye-baton-p1-review` detached61ff34b 是历史审查目录。清理任何目录前核对 worktree、进程、未提交和 ignored 内容；本次不要求清理。

## 6. 下一步 P3：已批准方向与尚需冻结的内容

**P3 是可解释的规则推荐/排序 + 作者建议，P4 才是自动邀请。** 不引入学习算法或 AI 推荐 Mentor。

用户想要：Paused 项目长时间无人接棒时增加曝光；具体问题久未得到回复或接近期望回复日期时增加优先级；给作者可行动的提示，如补充信息、缩小需求或延长希望回复日期。

必须区分：

- 项目层“无人接棒”的时间和关系；有无后续项目不等于问题是否被回复。
- 问题层“待引荐/待回复”的等待时间、follow_up 和 dueAt；导师已回复不等于问题已解决。
- 不凭等待天数宣称“很有可能收不到 solution”或伪造概率。用解释规则的中性英文提示，保留人工判断。

**具体分值、阈值、封顶、排序入口、过期处理、是否允许修改 dueAt、排序时钟与分页等尚未冻结。** 接手后先读现有字段与契约，提出最小可验收规则并记录为明确的方案，不把猜测写成用户已决定。确定契约和10个验收门槛后，给一个全栈 Agent 连续完成，避免拆成前后端worker。

P4 已批准的最终方向：系统自动发送**站内邀请**，匹配有经验的帮助者，限频/去重，支持接受/忽略/关闭自动邀请。不是邮件，不需要 Staff逐个审批；但本期不实施 P4，不配置 cron 或通知系统。

其他暂缓：AI Mentor shortlist、真实认证、上传、完整 Git fork、复杂接力图、共同所有者、自动延续 Mentor、Ongoing 接棒、Feed/活动/Office Hours。设计原型包含它们不表示已经授权实施。

## 7. 工作模式与汇报偏好

- 主控负责范围、契约、门槛、分支集成、独立验收与 PR；实现 Agent 负责一个阶段全部前后端/迁移/页面/测试。用户手动转交任务和报告，不能自动监控其聊天。
- **正常只汇报一次最终 READY**：分支、完整SHA、交付、四项检查及真实测试数、报告路径、限制/Not run、等待总控验收。不要求用户复制完整会话或每个中途提交。确实阻塞、凭据/重大契约问题才额外 BLOCKED；返修集中一次反馈。
- worker 完成后推送任务分支，不合并 main、不进入下一阶段、不自行部署。主控按精确SHA独立审查及测试，通过后给用户独立产品预览；产品接受与明确合并授权是不同记录。
- 用户希望看到“P3 已验收6/10，60%”这样的进度；**只按主控已验证门槛算百分比**，不把worker自报完成或代码量当作验收进度。无新报告/工具证据时不宣称后台监控。
- 不重复问已固定的角色、栈、deadline含义、UI语言、通知方式。不因纯文档交接重跑整套应用测试或产生付费调用。

## 8. 文档读取次序与冲突处理

先读本文 → `AGENTS.md`、`PROJECT_CONTEXT.md`、`project-docs/index.html`及MAINTENANCE → `docs/EXECUTION_ROADMAP.md` → `docs/API_CONTRACT.md`、`docs/P1_CONTRACT.md`、`docs/P2_CONTRACT.md` → `docs/P2_ACCEPTANCE.md`、`docs/COMMENT_DELETION.md` → `DECISIONS.md`。按需读 MVP_SPEC/ACCEPTANCE/PROJECT_OVERVIEW 与 design/README。

`docs/P1_AGENT_TASK.md`、`docs/P2_AGENT_TASK.md`是已执行任务记录，不是待重做任务。MVP_SPEC、ACCEPTANCE与旧表格中仍保留早期阶段措辞，以顶部当前状态说明、阶段最终验收和本文为当前状态；不能据旧“占位/未实现/不做AI/不做删除”倒退已验收功能。`docs/legacy/`只作归档。

项目文档经 `project-docs/index.html` 标记区块维护；下一轮同步规格、契约、验收与当前状态，不建立多套互相矛盾的需求。新账号权限/运行状态若与快照不同，记录事实差异后继续可进行的工作。

## 9. 新主控接手的第一个交付

1. 确认路径、git状态/分支/远程/PR3状态、上述服务及数据目录，不改动运行环境和密钥。
2. 简短回报“P2已全部验收；PR3是否合并；P3已验收0项；将沿用何基线”，明确事实与待定规则。
3. 为用户准备P3最小范围、可解释规则、契约与验收门槛，再生成一份单Agent任务书和可复制启动提示词；仅规划与写文档，不自行开始P3应用实现，也不自动启动外部worker。需要产品选择时集中最少问题，其余按合理方案推进。

本次交接只更新文档，没有重跑应用测试、调用模型、改变数据库、重启服务或合并main。
