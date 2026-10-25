# Buckeye Baton — 当前项目状态

更新：2026-10-24。仓库：https://github.com/BOWEN2491/buckeye-baton

## 定位
面向 OSU 学生的项目交接、接棒与导师连接平台。Project 是核心，经验写在项目内部。Student 留下与推进项目，Staff 针对具体问题引荐 Mentor，Mentor 提供指导。完整总览见 docs/PROJECT_OVERVIEW.md。

## 当前实现
已实现首页搜索/状态筛选、创建与所有者编辑、Ongoing/Finished/Paused 总结、原子校验后保存状态与持久化、四个演示身份。独立 Lesson UI 和采用流程已移除；旧链接转向项目，旧采用接口返回 410。历史记录保留。
P1 已实现真实接棒与双向来源关系、项目问题及期望回复日期、平铺讨论、Staff 人工引荐、指定 Mentor 多轮回复和角色工作台。总控已在独立目录核验提交 61ff34b，G1–G10 本地验收 10/10；证据见 docs/P1_ACCEPTANCE.md。

P2在codex/p2-integration已实现AI浏览简介/标签（所有者编辑确认、源变化回退）及Staff的Mentor Awaiting reply计数；df5f050总控验收10/10，未合并main。证据见docs/P2_ACCEPTANCE.md。

用户产品验收：P2全部通过，包括新增评论删除。项目所有者可删任意项目评论，评论作者可删自己的普通评论/追问/导师回复；问题与引荐保留，删除按有效帖子重算队列。见docs/COMMENT_DELETION.md。PR #3仍未合并，需明确合并授权。P3已在codex/p3-implementation实现（可解释Recommended/Newest、工作台Priority/Oldest first、所有者建议、问题作者修改回复日期），待总控独立验收，见docs/P3_REPORT.md。运行环境与版本详见docs/COORDINATOR_HANDOFF.md。

## 技术与验证
Next.js 15 / React / TypeScript / Node 22 / Tailwind / pg。当前本地 PGlite 为单进程持久 SQL，托管 pg 需 DATABASE_URL。Project.reflection 为可空 JSONB，增量迁移不重置记录。
最近总控独立验证：typecheck、生产 build/start、后端 9/9、浏览器 11/11 通过（P2评论删除补充），含四身份主线与390px。使用临时 PGlite，未操作用户数据。真实 PostgreSQL 多连接、真实认证、Neon/AWS、公网部署未验证。

## 设计与下一轮

P3单Agent准备完成：docs/P3_AGENT_TASK.md、docs/P3_CONTRACT.md、docs/P3_START_PROMPT.md。协调分支codex/p3-integration包含P2最终d97920f；worker使用codex/p3-implementation。P3做可解释Recommended/Priority排序、所有者建议及问题作者dueAt编辑；无新schema/AI调用/邀请。实现已交付codex/p3-implementation，待总控J1–J10独立验收。main尚无P2，不能直接作为P3起点。
P2任务书/契约为docs/P2_AGENT_TASK.md与docs/P2_CONTRACT.md。返修提交df5f050已独立验收10/10，R1–R3与E1均关闭；评论删除补充d97920f通过全部回归及用户验收。集成到codex/p2-integration，待main合并授权。3001运行d97920f，使用真实OpenAI/gpt-6-luna；配置及数据库位于p2-review目录，不可清理。既有真实调用证据已核对，本次未新增调用。3000仍运行P1，未重启或改数据。
实施协调入口：docs/EXECUTION_ROADMAP.md；P1 冻结契约：docs/P1_CONTRACT.md；单 Agent 全栈任务书：docs/P1_AGENT_TASK.md。任务分支 codex/p1-implementation 已交付；用户手动产品验收通过并授权合并，PR #2 已合入 main（合并提交 3b473deb2b01c708cac9f192663b4de1f352d4d4）。P1 本地功能验收 10/10。P2已通过总控及用户全部验收；P3进入规划，P4未开始，规则推荐、自动限频站内邀请按后续级别实现。deadline 属于具体求助期望回复日期。产品文案英文，待回复显示 Awaiting reply。

队友设计已收进 design/。relay 原型补齐接棒、来源对照、问题—引荐—回复及工作台；不再等待草图。
design/README.md 列出原型与批准需求的差异。共同所有者、Ongoing 接棒、自动延续 Mentor、选择性带入内容、帖子编辑等仍待统一；帖子删除已按用户验收补充实现。现有保留历史/单所有者/人工引荐规则继续有效，AI浏览内容已在P2实现；AI导师推荐与Feed等仍暂缓。

## 仓库约定
PR #1、PR #2 均已按用户授权合入 main，main 是包含 P0/P1 的唯一共享基线。
唯一开发目录：C:/Users/23678/.codex/workspaces/buckeye-baton。无独立工作的前后端预备分支/工作目录已清理，后续按任务创建短期 codex/ 分支。详见 docs/HANDOFF.md。
旧规划和验证记录归档到 docs/legacy/；旧练习从 Git 历史恢复，PRIOR_WORK.md 保留来源说明。
