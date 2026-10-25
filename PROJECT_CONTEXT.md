# Buckeye Baton — 当前项目状态

更新：2026-10-25。仓库：https://github.com/BOWEN2491/buckeye-baton

## 当前结论与执行入口

**当前预览（2026-10-25）：P4独立运行于http://127.0.0.1:3001，实际应用372646c。** 详见docs/P4_PREVIEW.md。独立持久演示库、自动邀请开启、真实OpenAI/gpt-6-luna已单次验证；Mia接棒邀请及Sarah求助邀请已生成。原3000/P3和数据保留，main不合并；当前3001已重启加载用户填写的P4.env.local；一次生成200，仅存Mia演示项目私有草稿，8项目及讨论/公开卡片保持。继续用户产品验收，不需重复建库/启动。

**最新（2026-10-25）：P4最终372646c独立技术验收10/10（100%）。** typecheck/build、backend20/20、e2e23/23与原竞态探针通过，R1/R2/R3及follow-up全部关闭。已集成codex/p4-integration；详见docs/P4_ACCEPTANCE.md。当前3001独立P4预览供用户产品验收，尚不合main；3000仍运行原P3，数据不变。

**P3用户产品验收通过，P4由单Agent交付并完成总控独立验收。** P4初始基线1c3ed64，最终372646c，已集成协调分支；用户尚未产品验收或授权合main。

- 当前P4协调分支origin/codex/p4-integration包含接受的372646c及验收文档；原worker分支codex/p4-implementation保留交付历史。main仍缺P2–P4，后续工作不能从旧main丢弃新功能。
- 任务书 docs/P4_AGENT_TASK.md；冻结契约 docs/P4_CONTRACT.md；启动提示词 docs/P4_START_PROMPT.md；总控进度 docs/EXECUTION_ROADMAP.md。
- 工作方式：一个外部全栈Agent连续实施、自测、push；通常只回传一次READY，用户转交短块。总控独立检查后安排用户产品验收，不自动合main或发布。

## 产品与已实现功能

Honda HackOHI/O 2026 项目。面向OSU学生的项目交接、经验传承和导师连接平台，Project是核心，经验写在项目内。Student发布/推进项目，Staff给具体问题引荐Mentor，Mentor正式指导。四个预设演示身份，不是真实登录。

- P0：首页搜索、状态筛选、创建及所有者编辑、三状态总结/校验/历史保留、身份切换回首页。独立Lesson UI/采用数字已清理，旧链接跳项目，旧采用写410，旧数据保留。
- P1：三种真实接棒创建关联Ongoing、来源/后续、项目问题、平铺讨论、Staff人工引荐、指定Mentor多轮正式回复、角色工作台。独立10/10及产品验收通过，PR #2已合入main。
- P2：最多三句AI浏览简介/标签，私有草稿→所有者确认→公开，源资料变化回退且不覆盖原文；Staff看Mentor Awaiting reply；评论作者可删自己的帖子，项目所有者可删所有帖子。独立及产品验收通过，PR #3未获最新合并授权。
- P3：Recommended/Newest、Priority/Oldest first、可解释排序、Suggestions for your project。4839e77技术验收10/10；产品反馈修订93359a4及Detail UI38e4901已通过用户验收。只按发布/未回答求助年龄加分，不再显示/编辑回复日期，不计算dueAt期限分；旧数据/API保留。编辑页只显示选中状态内容，完整reflection及未保存输入仍保留。

P3最新规则详见docs/P3_PRODUCT_REVISION.md；它覆盖旧P3_CONTRACT里的期限/UI规则。Paused零后续每完整周5分最多20，待处理问题每完整等待日5分最多30，项目只加单个最高问题分、最多50。同分精确微秒排序、正式回复/追问/删除口径保持。

## P4 已实现（技术验收通过，待用户产品验收）

所有角色统一Inbox：楼主收到新问题/回复、提问者收到引荐/回复、指定Mentor收到引荐/明确追问、引荐Staff收到正式回复。事件按收件人去重并排除自己，通知与业务同事务，删除帖子不泄露预览。Inbox不取代工作台。

另有长期无接棒Paused项目/老待回复问题的自动站内邀请：公开经验与作者标签匹配、持久限频/去重、接受/忽略、到期/失效、关闭自动邀请、Staff看有效帮助意向。接受不自动接棒/引荐，开关不影响Activity。显式启用的持续Node runner无浏览器自动检查；不新增收费服务、模型或外部邮件。规则/API以P4_CONTRACT为准。

## 当前预览与数据保护

- http://127.0.0.1:3000 继续运行已接受P3应用38e4901；本轮不重启/替换。
- 应用/构建目录 C:/Users/23678/.codex/workspaces/buckeye-baton-p3-detail；数据库及用户.env.local在buckeye-baton-p3-review。操作前读docs/P3_PREVIEW.md最新段及.data/p3-preview-runtime.json，重新确认PID/端口，不能只信旧文档。
- 配置存在但本轮未读/复制/调用模型，不能把当前环境说成“没有key”。旧P1/P2服务按用户要求停止，3001已停，旧库/配置保留。
- Study Room Finder Pilot已按用户要求表现为发布5周、Paused、无后续接棒；仅取消旧关系，后续Plus+项目保留。不要重置此手动数据。

## 技术、验证与分支

Next15.5.28 / React / TypeScript / Node22 / Tailwind / pg，显式PGlite单进程持久SQL，真实pg需DATABASE_URL。P3产品修订最终全量typecheck/build、backend13/13、e2e14/14通过，Detail UI另测类型/构建/实际点击/键盘/390px；没有因小UI重复宣称全套重跑。真实PostgreSQL多连接、Neon/AWS/公网/真实认证未验证。

main包含P0/P1；P2/P3已接受内容目前在协调开发线。PR #1/#2已按明确授权合并，不能把本次P3验收通过当PR #3合并授权。独立worker不用总控目录实现/构建，不动3000/旧库，不新增永久frontend/backend分支。重要证据见P1_ACCEPTANCE、P2_ACCEPTANCE、P3_ACCEPTANCE与P3_PRODUCT_REVISION。
