# P1 单 Agent 全栈任务书

2026-10-24。此文件取代旧 Worker A/B 分工。你独立完成整个 P1：类型、数据库、接口、页面与测试。当前对话中的总控负责最终独立验收。正常只在全部完成时汇报一次。

## 1. 仓库与开始方式

仓库：https://github.com/BOWEN2491/buckeye-baton
起点：origin/codex/p1-integration；任务分支：codex/p1-implementation。

使用你自己的克隆目录，不直接修改 main 或总控目录 C:/Users/23678/.codex/workspaces/buckeye-baton。
已有仓库先检查 git status，保留所有未提交工作，然后 fetch origin。不存在任务分支时从远程集成分支建立；若已存在，检查其状态后继续，不重置或强推。若之前按 A/B 任务做过工作，先核对并保留，不丢弃代码。
没有本地仓库时可先 git clone，再创建上述任务分支。

先读：AGENTS.md、PROJECT_CONTEXT.md、docs/EXECUTION_ROADMAP.md、docs/P1_CONTRACT.md、docs/API_CONTRACT.md、docs/MVP_SPEC.md、docs/ACCEPTANCE.md、design/README.md。
P1_CONTRACT 是本轮输入/输出和规则依据，design/relay 是视觉交互参考；原型新增功能不自动纳入。
使用 Node22 和现有依赖。所有产品可见文案用英文，导师工作台标签为 Awaiting reply。

## 2. 执行顺序：连续完成，不等中途验收

1. 共用类型：实现 src/shared/relay-types.ts，引用既有 User/Project/Reflection/Lesson；无需单独向总控交付类型，不再等待前后端同步。
2. 增量数据库迁移：新项目关系、项目问题、帖子与引荐使用 project_ 新表；保留原项目、reflection、历史与用户编辑。接棒创建和关系保存要原子、幂等，问题引荐要并发防重。
3. 服务端：实现 P1_CONTRACT 全部端点、权限和校验，提供固定虚构样例，先通过后端测试。
4. 正式页面：接棒表单、来源/后续关系、项目问题区、人工引荐、正式回复、角色工作台，全部接真实 API。
5. 浏览器联调：完成四身份主线和现有回归、失败状态、刷新与390px布局。
6. 完成运行接口文档与最终报告，提交并推送任务分支，输出一次“转交总控验收”短块，等待验收/返修。

可以自行做小批次提交与 push，不要求用户逐次转交。不要因为完成某个文件、页面或子任务就停下汇报。

## 3. 必须交付的后端能力

- 接棒：reproduce / continue / improve，共用表单；只从 Finished/Paused 创建当前学生自己的新 Ongoing。保留 source 和 successor 双向关系，不改来源项目或所有权。
- requestId 重试不重复创建；相同键不同输入409。数据库事务、参数化 SQL、唯一约束与服务端权限校验。
- 项目问题：学生可以提问，明确 wantsMentor，可选 dueAt 表示希望获得回复的日期。新建时若填写须为未来 ISO UTC 时间。
- 讨论平铺：四身份可普通评论，提问者明确 follow_up，指定 Mentor 才能 mentor_reply。
- 人工引荐：Staff 选择 Mentor 并写理由；每问题最多一条，重复/并发409；无导师请求的讨论不进入待引荐。
- 多轮指导：指定 Mentor 可以重复正式回复；明确追问重新待回复，普通评论/感谢不改变队列。
- 工作台：Staff Needs referral / Referred；Mentor Awaiting reply / Replied；只显示当前角色有权处理的内容。
- 项目改变状态不关闭问题；旧采用请求仍返回410；旧 Lesson 地址继续转向所属项目。

## 4. 必须交付的页面能力

- 首页保留项目搜索、状态筛选与创建，三状态详情和现有总结编辑不退化。
- 学生从 Finished/Paused 进入 /projects/:id/pick-up：方式、新名称、目标、来源只读参考。取消返回来源，提交中禁用，失败保留；同一表单重试复用 requestId。
- 成功打开新项目，显示来源；来源显示后续项目。其他关系规则以契约为准。
- 项目内提问、可选期望回复日期；本地日期输入转 ISO UTC，显示时按本地时区。
- 平铺评论、明确追问、Staff 引荐、被引荐 Mentor 正式回复及重复回复。普通评论不能伪装为正式回复。
- 工作台条目定位到 /projects/:id#q-:questionId，角色入口正确。
- 加载、空、成功、失败与409冲突提示清楚；失败输入保留；身份切换回未筛选首页；手机390px不溢出。
- 不恢复独立 Lesson、采用面板和计数，不使用 fixture 冒充真实保存。

## 5. 工作边界

可修改 P1 所需 src、db、scripts、tests；更新 docs/API_CONTRACT.md 记录已实现接口，并写 docs/P1_REPORT.md。
不要自行修改冻结的 P1_CONTRACT、协调台账、main 或依赖。涉及契约变更先报告总控。源码类型按契约实现不需要额外批准。
不做 P2–P4：AI、Mentor 负载汇总/排名、推荐、邀请、通知、共同所有者、自动继承导师、Ongoing 接棒、帖子编辑删除、选择性带入来源内容、部署或收费服务。
不读取或传出秘密，不提交环境变量、SQL本地数据、node_modules、构建和测试产物。每个本地SQL目录只能由一个进程占用。

## 6. 验证标准

必须覆盖 EXECUTION_ROADMAP 的 G1–G10，并保留既有P0回归：
- Node22：npm run typecheck、npm run test:backend、npm run build、npm run test:e2e，确认生产启动。
- 后端：权限、日期、来源规则、重复创建、并发引荐、同键异输入、回复归属、多轮队列、增量迁移/重启、历史保留、旧采用410。
- 页面主线：Alex 来源 → Mia 接棒 → Mia 提问 → Kevin 引荐 → Sarah 回复 → Mia 明确追问 → Sarah 再回复 → 更新项目状态与来源记录查看。
- 无需导师的讨论不进入Staff待办；普通评论不重新触发导师待回复。
- 真实请求失败保留输入；刷新持久化；桌面与390px无明显溢出、客户端异常或框架错误。
- E2E 用独立临时SQL，不污染用户正在使用的数据库。无法运行的检查必须写 Not run 和原因，不编造通过。

总控会再次独立验证。你的提交/自测完成不等于总控已通过，也不能自行给总体进度加分。

## 7. 正常只汇报一次：全部完成后

全部实现、检查与 push 完成后，写 docs/P1_REPORT.md：完成项、文件、真实测试命令与结果、截图证据、未完成项和风险。报告不要含秘密或冗长日志。
回复末尾直接给出下面的短块，让用户只复制这段给总控，不需要复制整个会话。

```text
【转交总控验收｜P1 单 Agent｜READY】
分支：codex/p1-implementation
已推送提交：<完整 SHA>
交付：P1 接棒、项目讨论、人工引荐、导师回复与工作台
检查：typecheck <结果>；backend <结果>；build <结果>；e2e <结果>
详细报告：docs/P1_REPORT.md
未完成/限制：<没有则写无，未运行的检查必须列出>
当前状态：等待总控独立验收；不进入 P2、不合并 main
```

收到总控返修意见后，集中修复并用同一模板再次交付。

## 8. 例外：真正阻塞时才额外汇报

只有需要改变契约/依赖/权限、分支冲突/无法推送，或同类错误尝试两次仍无法继续时才额外报告。暂停受影响的工作，可继续其他独立任务。不要反复重试相同失败或擅自换范围。

```text
【转交总控处理｜P1 单 Agent｜BLOCKED】
分支/提交：<分支、已推送 SHA 或说明尚未推送>
阻塞：<具体事项及简短错误>
已尝试：<方法与结果，不贴秘密>
需要决定：<明确的问题或建议>
仍可继续：<不受影响的工作，或无>
```
