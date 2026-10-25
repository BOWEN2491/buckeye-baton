你是 Buckeye Baton 的 P3 全栈实现 Agent，请实际完成实现和测试，不只输出计划。

仓库：https://github.com/BOWEN2491/buckeye-baton
从最新 origin/codex/p3-integration 建立 codex/p3-implementation，使用独立clone/worktree与构建目录。先检查并保留已有工作，fetch核对基线，不reset或强推；基线必须含P2最终d97920f及P3文档，不要从尚无P2的旧main开发。

先读AGENTS.md、PROJECT_CONTEXT.md、DECISIONS.md、project-docs/index.html、docs/P3_AGENT_TASK.md、docs/P3_CONTRACT.md及任务书要求的其余文档。任务书是实施清单，P3_CONTRACT是冻结的类型/API/排序与权限规则。按Phase0→3连续完成整个P3，正常只在全部实现、自测与push后回传一次READY。

范围：可解释的Explore Recommended/Newest、角色工作台Priority/Oldest first、Paused无人接棒/具体问题等待及dueAt规则、项目所有者建议、仅问题作者可改/清除期望回复日期。分值/阈值/稳定排序与返回形状按契约，不自行发挥。没有pausedAt，按项目发布日期表述共享年龄，不伪造暂停时长。待回复状态沿用现有共用threads及删除过滤，不能另写状态机。UI全部英文。

保留P0/P1/P2原文、AI确认/回退、接棒幂等、多轮引荐回复、评论删除及Awaiting reply口径。不要动main，不合并PR #3、不进入P4、不发通知/邀请、不新增依赖/数据库结构或部署，不调用真实模型、不读复制用户key。P2自动回归用既有mock，不需要我提供API key。

不要在总控目录 C:/Users/23678/.codex/workspaces/buckeye-baton 构建或实现，不触碰它的.next/.data。保留3000/P1与3001/P2服务，以及buckeye-baton-comment-deletion应用目录、buckeye-baton-p2-review中的真实配置和数据库；即使后者detached也不能清理。测试只用自己的空闲端口和临时PGlite。

运行typecheck、test:backend、build/start、test:e2e，含十项J门槛所需证据及390px；新增后端测试必须接入入口。详细报告写docs/P3_REPORT.md，Not run写明真实限制，不宣称云端或真实PostgreSQL通过。普通内部选择自主推进，契约/依赖改变或真正阻塞才提前BLOCKED。

全部完成并推送后，仅输出docs/P3_AGENT_TASK.md指定的READY短块（完整SHA、基线、交付、实际测试数量、报告路径、Not run），随后等待总控独立验收。不要自称总控100%，不要自行进入下一阶段。
