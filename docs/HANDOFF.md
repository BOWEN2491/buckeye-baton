# Buckeye Baton — 当前交接

**P4独立产品预览已启动：3001，应用372646c，runner开启，真实OpenAI/gpt-6-luna已单次验证。** 见[P4_PREVIEW.md](P4_PREVIEW.md)。p4-review现在持有活跃.next和独立SQL，不可重建/归档或另开连接；同时保留3000/P3。产品验收待用户进行，main不变。

**最新P4（2026-10-25）：372646c独立技术验收10/10。** 见[P4_ACCEPTANCE.md](P4_ACCEPTANCE.md)，四项检查/backend20/e2e23及原竞态探针通过，全部返修关闭。已集成P4协调分支，下一步独立P4预览与用户产品验收；3000继续P3，main未合并。

2026-10-24。**P3产品验收通过，启动P4单Agent。** 当前入口：[P4_AGENT_TASK.md](P4_AGENT_TASK.md)、[P4_CONTRACT.md](P4_CONTRACT.md)、[P4_START_PROMPT.md](P4_START_PROMPT.md)。原任务准备时为0/10，现以P4_ACCEPTANCE的10/10为准；任务书保留交付规格。

## 仓库与分支
仓库 https://github.com/BOWEN2491/buckeye-baton 。main含P0/P1，P2/P3已通过验收但尚无本次main合并授权。P4以最新origin/codex/p4-integration为协调基线，含38e4901及P4文档；worker用独立clone/worktree上的codex/p4-implementation。不得从旧main丢失P2/P3，不合PR #3、不强推、不覆盖现有工作。

总控checkout C:/Users/23678/.codex/workspaces/buckeye-baton 只协调/审查，不供外部worker实现或构建。原永久前后端准备分支已清理，design/是设计交付，旧练习可从Git历史恢复。

## 产品与执行
先读PROJECT_CONTEXT.md、project-docs/index.html、DECISIONS.md和PROJECT_OVERVIEW。当前P3规则以P3_PRODUCT_REVISION为准：年龄评分，无deadline UI/加分；保留Suggestions原入口/Detail和隐藏状态总结。旧规范中的日期规划只作历史。

P4含全角色动态Inbox与自动邀请，共用消息入口但工作台保留。正常只最终READY，真实阻塞才BLOCKED；总控按最终SHA独立验收K1–K10，随后用户产品验收。不要自动给其他对话发消息或创建任务。

## 当前预览保护
http://127.0.0.1:3000 继续运行P3应用源38e4901；应用/build在buckeye-baton-p3-detail，原验收SQL与真实配置在buckeye-baton-p3-review。实际PID、SHA、数据库绝对路径见P3_PREVIEW.md最新段及本地runtime manifest，操作前重新核对。该目录的HEAD可能只有文档变化，不代表运行应用已升级。

3001已停止，旧P1/P2数据库/env保留，不能清理detached worktree。不要重建活跃.next、复用用户.data或读取复制用户key。P4测试使用独立空闲端口/临时PGlite，模型真实调用0、旧P2回归mock。

## 验证
Node22，NEXT_TELEMETRY_DISABLED=1可避开本机Next遥测EXDEV。应用修改最终运行typecheck、test:backend、build、test:e2e并记录实际数量；文档准备只检查一致性/链接/结构/git差异，不冒充应用测试。PGlite单进程；真实pg多连接、Neon/AWS/public deployment未验证。
