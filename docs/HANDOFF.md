# Buckeye Baton — 协作与目录约定

## 当前运行状态（优先于下方历史快照）

用户已明确要求停止旧P1/P2服务，现3000为P3最终4839e77，3001已停；独立持久验收库已准备，无模型/mock或key加载。旧库/配置保留。运行应用在buckeye-baton-p3-review，不能清理其.next/.data；完整版本/PID/路径见[P3_PREVIEW.md](P3_PREVIEW.md)。

## P2已通过总控验收

用户已确认P2全部产品功能通过，包括评论删除补充；后端9/9、浏览器11/11。3001运行d97920f，真实OpenAI/gpt-6-luna，使用原P2数据库/配置。权限/队列语义见COMMENT_DELETION.md。PR #3未合并，尚需明确授权；P1服务及已有数据保留。详细接手说明与关键路径见[COORDINATOR_HANDOFF.md](COORDINATOR_HANDOFF.md)。P3进入规划。

P2实现分支codex/p2-implementation交付df5f050，R1–R3及E1已关闭，总控独立验收10/10并集成codex/p2-integration，之后增加d97920f评论删除。依据P2_ACCEPTANCE.md；P2_REVIEW.md保留前次历史。用户产品验收已通过，main等待明确合并授权。3000的P1服务和数据库保持不动。

## 已完成的P1

实现分支 codex/p1-implementation 已交付提交 61ff34b；总控独立验收本地 G1–G10 全部通过，已快进集成到 codex/p1-integration。报告见 P1_ACCEPTANCE.md。用户产品验收通过，PR #2 已合入 main（3b473de）；main已包含P1；P2状态见上文。P1_AGENT_TASK.md 保留为本轮已执行任务记录，不代表需要从头重做。

## 从哪里开始

当前P3最终4839e77已总控验收10/10并集成codex/p3-integration，后端13/13、浏览器14/14及两个原失败探针通过，见P3_ACCEPTANCE.md。P3_REVIEW.md为已关闭历史记录。下一步用户产品验收，P3产品预览尚未启动，现有3000/3001仍是P1/P2，不合并main、不进入P4。

先读 PROJECT_CONTEXT.md 和 docs/PROJECT_OVERVIEW.md，再读 MVP_SPEC.md、API_CONTRACT.md、PHASE1_ACCEPTANCE.md。ACCEPTANCE.md 是完整未来目标，不代表当前功能已完成。

用户已授权将 PR #1 合入 main，main 作为唯一共享基线。唯一开发目录：
C:/Users/23678/.codex/workspaces/buckeye-baton

旧 codex/buckeye-baton-frontend、codex/buckeye-baton-backend 及对应工作目录没有独立内容，已删除。Downloads 设计目录是文件交付，不是另一个开发仓库；设计已纳入本仓库 design/。

## 今后如何协作

- 开始任务前核对远程和工作区，再按任务建立短期 codex/ 分支。P2未合并前，P3须以包含d97920f的最新P2集成提交为基础，不能从旧main丢弃P2；P2合并后再统一main。不保留永久前端/后端预备分支。
- 只有确实同时修改代码时才为任务建立独立工作目录。页面与后端共用类型、接口、迁移必须先协调。
- 用户主要负责开发，队友负责设计、文案和试用；协调方审查集成与验收。
- 前端负责 pages/components/client/styles，后端负责 API/server/database/scripts。任务完成通过 PR 合入 main，再清理分支与临时工作目录。
- 不丢弃未提交内容，不重置用户记录，不提交环境变量、数据库、依赖或构建目录。

## 当前及下一轮

已完成项目浏览、三状态详情与所有者总结编辑，以及P1接棒、问题、引荐、多轮回复和工作台。P2的AI简介/标签、Mentor负载和评论删除已通过总控与用户验收，PR #3等待明确合并授权；下一阶段规划P3规则推荐。不要恢复独立Lesson或逐条采用UI。

## 运行与验证

使用 Node 22，按根 README 安装、配置与启动。当前本地预览为 http://127.0.0.1:3000。
本地 PGlite 目录只由一个进程使用；测试有独立临时库。并行开发时用不同端口和数据目录。
应用修改后按范围运行 typecheck、test:backend、build 和 test:e2e。文档/分支清理检查差异与结构，不用重复应用测试冒充新功能证据。
真实 PostgreSQL、AWS 权益和公网部署另行验证。
