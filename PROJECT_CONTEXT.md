# Buckeye Baton — 当前项目状态

更新：2026-10-24。仓库：https://github.com/BOWEN2491/buckeye-baton

## 定位
面向 OSU 学生的项目交接、接棒与导师连接平台。Project 是核心，经验写在项目内部。Student 留下与推进项目，Staff 针对具体问题引荐 Mentor，Mentor 提供指导。完整总览见 docs/PROJECT_OVERVIEW.md。

## 当前实现
已实现首页搜索/状态筛选、创建与所有者编辑、Ongoing/Finished/Paused 总结、原子校验后保存状态与持久化、四个演示身份。独立 Lesson UI 和采用流程已移除；旧链接转向项目，旧采用接口返回 410。历史记录保留。
P1 已实现真实接棒与双向来源关系、项目问题及期望回复日期、平铺讨论、Staff 人工引荐、指定 Mentor 多轮回复和角色工作台。总控已在独立目录核验提交 61ff34b，G1–G10 本地验收 10/10；证据见 docs/P1_ACCEPTANCE.md。

## 技术与验证
Next.js 15 / React / TypeScript / Node 22 / Tailwind / pg。当前本地 PGlite 为单进程持久 SQL，托管 pg 需 DATABASE_URL。Project.reflection 为可空 JSONB，增量迁移不重置记录。
最近总控独立验证：typecheck、生产 build/start、后端 5/5、浏览器 7/7 通过，含四身份主线与390px。使用临时 PGlite，未操作用户数据。真实 PostgreSQL 多连接、真实认证、Neon/AWS、公网部署未验证。

## 设计与下一轮
当前准备P2：单Agent任务书 docs/P2_AGENT_TASK.md，待实现契约 docs/P2_CONTRACT.md。协调分支 codex/p2-integration 从main准备，实现方独立克隆并建 codex/p2-implementation；正常最终回传一次READY，必要凭据决定/阻塞才额外报告。P2实现分支已交付677a1d7，总控独立验收7/10：R1输入裁剪JSON、R2上游错误形状、R3候选负载刷新需返修，H3待补已有真实AI证据，详见docs/P2_REVIEW.md。未集成到当前协调分支或main；P1预览不重启、不改数据。默认准备OpenAI路径但provider、key复用和模型须在API实现前安全确认，不能把计划当作凭据可用证明。
实施协调入口：docs/EXECUTION_ROADMAP.md；P1 冻结契约：docs/P1_CONTRACT.md；单 Agent 全栈任务书：docs/P1_AGENT_TASK.md。任务分支 codex/p1-implementation 已交付；用户手动产品验收通过并授权合并，PR #2 已合入 main（合并提交 3b473deb2b01c708cac9f192663b4de1f352d4d4）。P1 本地功能验收 10/10。P2已交付待返修验收；P3–P4未开始，规则推荐、自动限频站内邀请按后续级别实现。deadline 属于具体求助期望回复日期。产品文案英文，待回复显示 Awaiting reply。

队友设计已收进 design/。relay 原型补齐接棒、来源对照、问题—引荐—回复及工作台；不再等待草图。
design/README.md 列出原型与批准需求的差异。共同所有者、Ongoing 接棒、自动延续 Mentor、选择性带入内容、帖子编辑删除等仍待统一。现有保留历史/单所有者/人工引荐规则继续有效，AI 与 Feed 等新增服务暂缓。

## 仓库约定
PR #1、PR #2 均已按用户授权合入 main，main 是包含 P0/P1 的唯一共享基线。
唯一开发目录：C:/Users/23678/.codex/workspaces/buckeye-baton。无独立工作的前后端预备分支/工作目录已清理，后续按任务创建短期 codex/ 分支。详见 docs/HANDOFF.md。
旧规划和验证记录归档到 docs/legacy/；旧练习从 Git 历史恢复，PRIOR_WORK.md 保留来源说明。
