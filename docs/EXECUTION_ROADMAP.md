> 2026-10-25 current status: P0–P4 are user product accepted, including final pickup-only invitations and deletion visibility. PR #3 merged into main as3bf29b3 with all accepted P2–P4. See RELEASE_ACCEPTANCE.md. The earlier pending/no-merge statuses below are historical.

# Buckeye Baton — 分级实施与总控台账

2026-10-25。**P3含产品修订已通过用户验收，当前启动P4。** P4最终372646c独立技术验收 **10/10（100%）**，全部返修关闭；详见[P4_ACCEPTANCE.md](P4_ACCEPTANCE.md)。待用户产品验收，不合main。按一个外部全栈Agent、用户转交一次最终READY、总控独立验收的方式执行。

## 已确认蓝图与当前状态

Project为核心：浏览成果与经验→接棒创建自己的项目→提出具体问题→Staff人工引荐→Mentor指导→后续成果。AI仅辅助浏览简介/标签并经所有者确认。UI英文，负载叫Awaiting reply。无真实登录、上传、代码fork、AI引荐或外部消息。

| 级别 | 内容 | 当前状态 |
|---|---|---|
| P0 | 浏览、三状态、所有者编辑/校验、历史持久和旧采用清理 | 已通过，已合main |
| P1 | 接棒/来源后续、问题、平铺讨论、人工引荐、多轮正式回复/工作台 | 总控10/10及产品验收；PR #2已合main |
| P2 | 所有者确认AI简介/标签、Mentor负载、评论删除 | 总控及产品通过；main合并未获最新授权 |
| P3 | 年龄规则推荐/解释、Suggestions、按状态编辑表单和Detail说明 | 技术10/10及修订产品验收通过；应用38e4901 |
| P4 | 四角色Activity Inbox + 经验匹配自动邀请/限频去重/接受忽略/设置 | 372646c独立10/10，已集成协调分支、待用户产品验收 |

**当前P3不含deadline评分或日期UI。** 用户撤销了该变量，legacy dueAt只保留兼容数据/API；问题按当前未回答求助年龄，项目按发布年龄。Paused零后续每周5最多20，问题每等待日5最多30，项目取单个最高问题再加项目分最多50。精确微秒排序仍保留。详见[P3_PRODUCT_REVISION.md](P3_PRODUCT_REVISION.md)，旧任务书/初次J6日期门槛为历史。

## P4 当前执行入口

- 最新协调基线origin/codex/p4-integration已包含372646c及独立验收文档；原worker基线1c3ed64/分支codex/p4-implementation保留交付历史，不能从旧main丢弃已验收新功能。
- [单一任务书](P4_AGENT_TASK.md)、[冻结契约](P4_CONTRACT.md)、[启动提示词](P4_START_PROMPT.md)。
- 一个Agent连续Phase0发现→Phase1 Inbox/动态→Phase2邀请/runner→Phase3全量验证。阶段之间不需回传/等总控；正常仅最终READY，真实阻塞才BLOCKED。
- 总控审查最终完整SHA、报告和K门槛后再安排用户验收；不把worker自报当已验收。用户可随时问状态，但不假称后台监控未连接Agent。
- 保留3000/P3服务及其应用/DB/env和旧库。main与PR #3本轮不合并，应用预览不在文档准备时替换。

## P4 十个独立验收门槛

每项独立通过10%。已核验372646c，K1–K10全部通过。typecheck/build、backend20/20、e2e23/23和原竞态探针均通过；失败历史保留在P4_REVIEW/P4_RECHECK，最新结论为P4_ACCEPTANCE。

- [x] K1：增量schema/约束/重跑/重启保留旧历史，不回填Activity。
- [x] K2：角色事件矩阵、自发排除/去重、通知与业务同事务。
- [x] K3（R1已关闭）：私人Inbox与游标/已读/设置/应答权限，删除脱敏、精确分页、GET不写。
- [x] K4（R2与follow-up已关闭）：四角色Inbox/未读/筛选/定位，持久已读/刷新/身份隔离/错误恢复。
- [x] K5：两类年龄资格、共用pending事件、真实公开经验证据匹配、稳定无候选结果。
- [x] K6：数据库滑动限额/永久去重/统一锁，双派发与相关业务竞争。
- [x] K7：接受/忽略/到期/取消、周期失效与关闭再开；Activity不被静音。
- [x] K8：接受只记意向，Staff看有效帮助者并保留人工引荐/原接棒/负载。
- [x] K9（R3已关闭）：无浏览器生产自动runner、停用/失败恢复/重启、构建与GET不派发。
- [x] K10：最终typecheck/backend/build/start/e2e、旧旅程和390px、可复验报告与Not run。

总控进度示例：“P4已独立验收6/10，60%；通知与权限通过，自动派发和完整页面待核验。”分母固定10，不按代码行或文档篇幅估计。

## 已完成验收历史

P1独立G1–G10共10/10，提交61ff34b，后端5/5、e2e7/7；用户验收后授权PR #2合main。见[P1_ACCEPTANCE.md](P1_ACCEPTANCE.md)。

P2独立H1–H10共10/10，最终df5f050；R1–R3/E1关闭，既有真实AI证据已核对，无需为P4再付费调用。评论删除补充d97920f全量回归与用户验收通过。见[P2_ACCEPTANCE.md](P2_ACCEPTANCE.md)、[COMMENT_DELETION.md](COMMENT_DELETION.md)。

P3独立J1–J10初版最终4839e77共10/10，backend13/13、e2e14/14与原R1探针通过；随后产品修订93359a4全量通过，Detail38e4901类型/构建和点击/键盘/390px通过。用户已确认修订全部验收通过。原deadline/J6日期UI已被修订覆盖，不能因初版测试恢复。见[P3_ACCEPTANCE.md](P3_ACCEPTANCE.md)、[P3_PRODUCT_REVISION.md](P3_PRODUCT_REVISION.md)。

真实PostgreSQL多连接、Neon/AWS/公网和serverless调度未验证。演示身份不是真实认证。云端上线与main合并仍需按用户实际授权处理。
