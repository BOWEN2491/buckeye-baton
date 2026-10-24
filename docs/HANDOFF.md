# Buckeye Baton — 协作与目录约定

## 当前进行中的 P1

实现分支 codex/p1-implementation 已交付提交 61ff34b；总控独立验收本地 G1–G10 全部通过，已快进集成到 codex/p1-integration。报告见 P1_ACCEPTANCE.md。main 继续作为稳定基线，须通过 PR 合并；P2 未开始。P1_AGENT_TASK.md 保留为本轮已执行任务记录，不代表需要从头重做。

## 从哪里开始

先读 PROJECT_CONTEXT.md 和 docs/PROJECT_OVERVIEW.md，再读 MVP_SPEC.md、API_CONTRACT.md、PHASE1_ACCEPTANCE.md。ACCEPTANCE.md 是完整未来目标，不代表当前功能已完成。

用户已授权将 PR #1 合入 main，main 作为唯一共享基线。唯一开发目录：
C:/Users/23678/.codex/workspaces/buckeye-baton

旧 codex/buckeye-baton-frontend、codex/buckeye-baton-backend 及对应工作目录没有独立内容，已删除。Downloads 设计目录是文件交付，不是另一个开发仓库；设计已纳入本仓库 design/。

## 今后如何协作

- 开始任务前更新 main 并检查工作区，再按具体任务建立短期 codex/ 分支；不保留永久前端/后端预备分支。
- 只有确实同时修改代码时才为任务建立独立工作目录。页面与后端共用类型、接口、迁移必须先协调。
- 用户主要负责开发，队友负责设计、文案和试用；协调方审查集成与验收。
- 前端负责 pages/components/client/styles，后端负责 API/server/database/scripts。任务完成通过 PR 合入 main，再清理分支与临时工作目录。
- 不丢弃未提交内容，不重置用户记录，不提交环境变量、数据库、依赖或构建目录。

## 当前及下一轮

已完成项目浏览、三状态详情与所有者总结编辑，以及 P1 接棒关系、项目问题、Staff 引荐、Mentor 多轮回复和角色工作台。下一步是 PR 审阅/合并；P2 的 AI 简介/标签和 Mentor 负载尚未实现。不要恢复独立 Lesson 或逐条采用 UI。

## 运行与验证

使用 Node 22，按根 README 安装、配置与启动。当前本地预览为 http://127.0.0.1:3000。
本地 PGlite 目录只由一个进程使用；测试有独立临时库。并行开发时用不同端口和数据目录。
应用修改后按范围运行 typecheck、test:backend、build 和 test:e2e。文档/分支清理检查差异与结构，不用重复应用测试冒充新功能证据。
真实 PostgreSQL、AWS 权益和公网部署另行验证。
