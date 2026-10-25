你是 Buckeye Baton 的 P4 全栈实现 Agent，请实际完成实现和测试，不只输出计划。

仓库：https://github.com/BOWEN2491/buckeye-baton
先检查保留已有工作，fetch最新 origin/codex/p4-integration，以它建立 codex/p4-implementation；若分支已有则核对后继续，不reset或强推。必须包含已验收P3应用38e4901及最新P4三份文档，不能从缺少P2/P3的旧main开始。使用自己的clone/worktree、构建目录、空闲测试端口与独立临时SQL。

先读project-docs/index.html、AGENTS.md、PROJECT_CONTEXT.md、DECISIONS.md、docs/P4_AGENT_TASK.md、docs/P4_CONTRACT.md及任务书要求的其余文档。任务书为实施顺序，P4_CONTRACT为冻结规则/API/类型。一个Agent连续完成全部Phase0–3，正常只在实现、自测、提交和推送后回传一次READY。

范围：所有角色统一Inbox，楼主的新问题/回复通知、提问者的引荐/回复通知、Mentor的引荐/明确追问提醒、引荐Staff的正式回复通知；另含Paused项目/长期未回答求助的自动邀请、公开经验标签匹配、数据库限频与永久去重、接受/忽略、关闭自动邀请、Staff查看有效帮助意向。所有产品文案英文。

保留工作台和P0–P3全部行为：人工引荐、正式导师回复权限、Awaiting reply、原文/AI确认回退、接棒幂等、评论删除及历史。P3已按产品反馈改成只按发布/等待年龄，不再有期限加分或日期界面。保留Suggestions for your project的Detail收起说明、原入口和按状态显示的编辑表单。

严格按契约做业务事件与通知同事务、收件人去重/排除自己、删除内容脱敏、私人Inbox权限、已读与邀请分离。邀请接受仅是意向，不自动建项目或引荐；不伪造“已解决”统计/导师历史。Node生产runner需无浏览器自动运行，显式启用、60秒检查、持久限额/锁/重启恢复；GET不派发，不另开进程连接活跃PGlite，不声称云端调度已验证。

不新增依赖或外部服务、不部署、不调用真实模型、不读取复制用户key、不改main或合并PR #3。旧P2自动回归用既有mock，无需我提供API key。
不要在总控目录 C:/Users/23678/.codex/workspaces/buckeye-baton 实现或构建。保留现有3000/P3服务；buckeye-baton-p3-detail是活跃应用，buckeye-baton-p3-review持有其真实配置与数据库，旧P1/P2库也保留，不能清理或重置。不要用3000或触碰其他运行服务，端口使用前重新核对。

最终SHA运行typecheck、test:backend、build/start、test:e2e，含K1–K10所需证据、四身份和390px；新增测试接入入口。写docs/P4_REPORT.md、docs/P4_MANUAL_ACCEPTANCE.md、已实现API与运行说明并更新适用项目文档。Not run明确列出，不把单连接PGlite并发测试称为真实pg多连接通过。

普通实现细节自主推进；契约/依赖变化或真正阻塞才提前BLOCKED。全部完成push后，只输出docs/P4_AGENT_TASK.md的READY短块（完整SHA、基线、实际检查数量、自动派发证明、报告和Not run），随后等总控独立验收。不要自称总控100%，不要替换用户3000预览或自行进入部署。
