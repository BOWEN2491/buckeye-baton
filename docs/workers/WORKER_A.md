# Worker A — P1 Backend

将本任务整份转交给负责后端的 agent。所有产品可见文案使用英文。

## 开始
仓库 https://github.com/BOWEN2491/buckeye-baton 。fetch 后从 origin/codex/p1-integration 创建短期 codex/p1-api，在你自己的目录执行。不要直接改 main 或总控的工作目录。
先读 AGENTS.md、PROJECT_CONTEXT.md、docs/EXECUTION_ROADMAP.md、docs/P1_CONTRACT.md 与当前 API 契约。

## 第一小交付：共用类型
先只实现 src/shared/relay-types.ts 中的 P1 公共类型，不改现有功能。单独提交并 push，立即回传 commit SHA。总控确认后会把这个原提交合入集成分支，供 B 同步。
后续契约改动先报告总控，不独自变更。

## 实现责任
拥有 db/、src/server/、src/app/api/、src/shared/relay-types.ts、src/shared/relay-fixtures.ts、后端测试和数据库脚本。不要改正式页面、components、styles、e2e 或共用项目文档。
按 P1_CONTRACT 实现接棒/关系、项目问题/帖子/引荐与工作台。使用增量新表，保留 reflection 和旧历史；旧采用请求仍410。
坚持单所有者、人工引荐、幂等创建、并发防重和事务。follow_up 恢复待回复，普通评论不恢复。
提供固定虚构素材，不在种子里自动写成已完成真实接棒旅程，不覆盖用户编辑。保持原四身份；多导师负载样例留 P2。
按契约新文件组织，不把项目逻辑继续塞入旧 lesson 处理分支。
无新依赖、无 AI、无外部通知、无部署，不读取或传出秘密。

## 验证和回传
使用 Node22；运行类型检查和后端测试，覆盖 G1–G9 的 API层、重复创建/并发引荐/权限/日期/重启与迁移。不要在总控正在构建时共用同一 .next/SQL目录。
每个小批次提交并 push 后回传：分支、SHA、改动文件、通过的真实检查、未完成项、契约问题。不得声称页面旅程已通过，不能自行合并 main。

除第一份类型提交外，每批将简短交接结果保存在你专属的 docs/workers/REPORT_A.md 并一起推送；这是唯一允许你修改的共用文档目录文件。这样用户只需通知总控“A 已推送”，总控即可 fetch 分支、读取报告并验证代码，无需转抄长日志。
