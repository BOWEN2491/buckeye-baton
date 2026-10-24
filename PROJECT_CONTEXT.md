# Buckeye Baton — 当前项目状态

更新：2026-10-24。仓库：https://github.com/BOWEN2491/buckeye-baton

## 定位
面向 OSU 学生的项目交接、接棒与导师连接平台。Project 是核心，经验写在项目内部。Student 留下与推进项目，Staff 针对具体问题引荐 Mentor，Mentor 提供指导。完整总览见 docs/PROJECT_OVERVIEW.md。

## 当前实现
已实现首页搜索/状态筛选、创建与所有者编辑、Ongoing/Finished/Paused 总结、原子校验后保存状态与持久化、四个演示身份。独立 Lesson UI 和采用流程已移除；旧链接转向项目，旧采用接口返回 410。历史记录保留。
接棒、项目问题、引荐、Mentor 指导及工作台仍是占位，尚未接通真实项目流程。不可用旧 Lesson 测试证明完整新流程。

## 技术与验证
Next.js 15 / React / TypeScript / Node 22 / Tailwind / pg。当前本地 PGlite 为单进程持久 SQL，托管 pg 需 DATABASE_URL。Project.reflection 为可空 JSONB，增量迁移不重置记录。
最近应用验证：typecheck、生产 build、后端 3/3、浏览器 5/5 通过。修改文档与分支不代表重新跑过应用测试。真实认证、Neon/AWS、公网部署仍未验证。

## 设计与下一轮
队友设计已收进 design/。relay 原型补齐接棒、来源对照、问题—引荐—回复及工作台；不再等待草图。
design/README.md 列出原型与批准需求的差异。共同所有者、Ongoing 接棒、自动延续 Mentor、选择性带入内容、帖子编辑删除等仍待统一。现有保留历史/单所有者/人工引荐规则继续有效，AI 与 Feed 等新增服务暂缓。

## 仓库约定
用户已授权通过 PR #1 将当前应用合入 main，并以 main 为唯一共享基线。
唯一开发目录：C:/Users/23678/.codex/workspaces/buckeye-baton。无独立工作的前后端预备分支/工作目录已清理，后续按任务创建短期 codex/ 分支。详见 docs/HANDOFF.md。
旧规划和验证记录归档到 docs/legacy/；旧练习从 Git 历史恢复，PRIOR_WORK.md 保留来源说明。
