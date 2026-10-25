# P3 总控独立审查：需修复一项排序问题

日期：2026-10-24。候选分支 `codex/p3-implementation`，精确提交 **2977e4defcd1a7f459718d94e2c9e98b75e724c0**，基线b1563aa。总控在独立worktree `C:/Users/23678/.codex/workspaces/buckeye-baton-p3-review` 检出该提交；没有修改候选应用源码或合并进协调分支。

结论：**8/10（80%），R1待修复，尚未通过最终独立验收。** 四项现有检查全部通过，不代表额外边界探针已通过。J4、J5受同一排序精度问题影响，其余门槛本地通过；真实pg/云端不在本结论内。

## 独立检查与证据

| 检查 | 总控结果 |
|---|---|
| npm ci --no-audit --no-fund | 独立目录安装完成，185 packages |
| npm run typecheck | 通过 |
| npm run test:backend | 11/11，36.6s |
| npm run build | 通过 |
| npm run test:e2e | 14/14，41.6s；Playwright启动next start，3206/3296，隔离临时PGlite和本地mock |
| 桌面与390px | 实际查看本次截图：推荐首页、项目优先原因/讨论/接棒、Staff工作台；布局可用。既有四身份、AI确认回退、负载与删除旅程回归通过 |
| 额外精度探针 | 两场景均失败，见下；不在实现方原11项测试覆盖中 |
| Git/范围 | diff --check通过；db/schema.sql与package/lock无改动；没有提交真实.env、数据库或构建目录 |

Node22，NEXT_TELEMETRY_DISABLED=1。本次真实模型调用0次。CUA浏览器工具返回“Local browser use is disabled in Work settings”；使用项目Playwright及其产出的截图验证，未修改该设置。截图位置 `C:/Users/23678/AppData/Local/Temp/buckeye-baton-coordinator-p3-2977e4d/`。

## R1 — 保留跨问题排序的微秒精度（P2优先级，阻断J4/J5）

位置：`src/server/priority.ts:43–46` 的byQuestionPriority；上游 `src/server/relay.ts` 的threads把question.createdAt与post.createdAt经Date.toISOString转换成毫秒ISO。**帖子在单个讨论内的先后仍正确；本问题是跨问题的pendingSince/createdAt比较。**

当前comparator对这些已截断时间做localeCompare，然后按ID排序。真实数据库时间不同、却落在同一毫秒内时，较新问题可能排在较旧问题前；同分项目聚合也可能把错误问题作为原因来源。不是随机不稳定，而是稳定地违反契约中的时间优先顺序。

总控使用独立临时PGlite、固定asOf=`2027-03-01T12:00:00.000Z`，通过真实handle/API路径复现；没有使用用户数据。完整结果已提交到 [evidence/P3_TIMESTAMP_PROBE.json](evidence/P3_TIMESTAMP_PROBE.json)。

### 场景A：从未正式回复的问题，创建时间差100微秒

同一Ongoing项目、同一学生，均wantsMentor=true、无dueAt/引荐/帖子：

| 问题ID | 数据库createdAt | 等待分 |
|---|---|---|
| z-earlier | 2027-02-20T12:00:00.000100Z | 30 |
| a-later | 2027-02-20T12:00:00.000200Z | 30 |

- `workbench?sort=oldest` 正确返回 `[z-earlier,a-later]`。
- `workbench?sort=priority` 实际返回 `[a-later,z-earlier]`，应为 `[z-earlier,a-later]`。
- 项目priority原因实际指向a-later，应指向z-earlier。

### 场景B：追问时间差100微秒，创建顺序与等待顺序相反

将z-earlier创建时间设为2027-02-19，a-later维持2027-02-20。分别引荐Sarah，在2027-02-21各添加正式回复，再添加下列有效follow_up：

| 问题 | 第一条未回答追问createdAt |
|---|---|
| z-earlier | 2027-02-22T12:00:00.000200Z |
| a-later | 2027-02-22T12:00:00.000100Z |

两者等待分均30。Priority实际 `[z-earlier,a-later]`，应为 `[a-later,z-earlier]`；项目原因实际选z-earlier，应选a-later。**只删除ID比较、保留原问题SQL顺序也不能修好此场景。**

### 修复与复验要求

- 服务端保留pendingSince及question.createdAt的精确排序依据，例如内部微秒键/适当SQL排序；在同分时严格按pendingSince、question.createdAt、id比较。维持单一规则模块和共用有效帖子读取，不新增schema、不改变公开ISO日期格式/旧响应形状，不引入客户端状态机。
- 项目最高分问题选择与工作台Priority都用修复后的比较规则。只在真正完整时刻相同后才按下一字段/ID比较；保留原Newest/Oldest顺序与权限。
- 增加场景A、B的真实SQL/API回归，同时断言工作台顺序及项目原因questionId；并验证新增测试在2977e4d原实现失败、修复后通过。至少再覆盖完整时刻相同时才按ID的并列。
- 重跑最终SHA的typecheck、backend、build/start、e2e，更新P3_REPORT，推送后一次READY。四项现有检查的本次通过记录不替代返修后的最终检查。

## 非阻断文案建议

ReplyDateEditor当前提示 `Changing it does not move the question in any mentor’s queue.`，容易理解为排序不变，而P3正是按日期排序。建议改成：`Changing the date may change its priority, but does not change its reply status or mentor assignment.` 不更改业务规则。

## J门槛状态

| 门槛 | 本地结果 |
|---|---|
| J1 共享年龄/无接棒资格 | 通过 |
| J2 共用状态/等待周期/删除 | 通过，单讨论SQL次序保持 |
| J3 分值/期限边界/解释 | 通过 |
| J4 max聚合/稳定排序/过滤 | **待修R1：同分原因问题选择不按精确时间** |
| J5 工作台优先排序/兼容/权限 | **待修R1：跨问题同毫秒时间先后错误** |
| J6 作者日期PATCH | 通过 |
| J7 页面原因/建议/刷新 | 通过，常规旅程一致；R1由J4/J5单列 |
| J8 失败/输入/身份/390px | 通过 |
| J9 P0/P1/P2历史回归 | 通过 |
| J10 四项检查/生产启动/证据 | 通过；最终修复SHA需重跑 |

## 环境与后续

3000/P1 PID25596、3001/P2 PID31004仍保留；两边既有数据与配置未操作。本次临时测试服务由Playwright结束，未启动面向用户的P3预览。main未改，PR #3未合并，P3候选应用尚未集成，不进入P4。

真实PostgreSQL/Neon/AWS/公网/多实例Not run，PGlite不证明多连接竞争。下一步将本报告R1一次转交实现Agent，收到新SHA后总控复验，再提供产品验收版本。
