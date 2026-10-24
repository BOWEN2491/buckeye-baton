# Worker B — P1 Frontend

将本任务整份转交给负责页面的 agent。所有产品可见文案使用英文，导师待回复标签使用 Awaiting reply。

## 开始
仓库 https://github.com/BOWEN2491/buckeye-baton 。fetch 后从 origin/codex/p1-integration 创建短期 codex/p1-ui，在你自己的目录执行。不要直接改 main 或总控的工作目录。
先读 AGENTS.md、PROJECT_CONTEXT.md、docs/EXECUTION_ROADMAP.md、docs/P1_CONTRACT.md 与 design/README.md。

## 并行顺序
可先做接棒表单、项目问题区和工作台布局。A 先交付共用类型，总控确认并推入集成分支后，你保存当前工作，再 fetch 并 merge origin/codex/p1-integration，使用 src/shared/relay-types.ts。
不要自己定义第二套接口类型。可用契约一致的开发 fixtures 做布局，但正式交付必须接真实 API；不要把 fixture 当作可保存功能。

## 实现责任
拥有 src/app/ 非API页面、src/components/、src/lib/、styles 和 tests/e2e/。不改 db、server、api、共用类型、依赖或共用项目文档。
1. Finished/Paused 学生接棒按钮进入 /projects/:id/pick-up。三种方式、新名称、目标、来源只读参考；提交中禁用，失败保留，取消返回来源。requestId 每个表单会话生成一次，重试复用。
2. 成功进入新 Ongoing 项目，展示来源与后续链接。保留现有三状态经验、编辑、筛选、旧链接重定向及旧采用UI清理。
3. 项目问题：Student 提问，选择是否需要导师，填写可选的期望回复日期。日期输入按本地转换ISO UTC。平铺评论、问题作者明确追问、指定导师正式回复按契约操作。
4. Staff 在问题下选导师写理由，重复引荐409有清楚提示；Mentor 正式回复带正确标识。
5. Staff 的 Needs referral / Referred 与 Mentor 的 Awaiting reply / Replied 工作台，定位到对应项目问题；普通评论不会触发待回复。
6. 手机390px、加载/空/失败/成功状态和身份切换保留。不恢复旧Lesson入口，不增加AI/推荐/通知/共同所有者。

## 验证和回传
保留已有浏览器回归，增加完整 Alex→Mia接棒→提问→Kevin引荐→Sarah回复→Mia追问→Sarah再回复→状态保存旅程。覆盖重复提交、非所有者、日期、刷新、失败保留及手机布局。
本机后端未就绪可先交布局，但必须标注未联调。最终测试用独立临时SQL，不能污染真实演示库。
每批提交push后回传：分支、SHA、文件、真实测试结果、截图证据、未完项、阻塞。不能自行合并 main。

每批将简短交接结果保存在你专属的 docs/workers/REPORT_B.md 并一起推送；这是唯一允许你修改的共用文档目录文件。用户只需通知总控“B 已推送”，总控即可 fetch 分支并读取报告。不要把完整日志或私密配置放入报告。
