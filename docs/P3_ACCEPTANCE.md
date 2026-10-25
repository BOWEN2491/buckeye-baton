# P3 总控最终独立验收

产品反馈修订：原10/10是4839e77版本技术证据。用户随后要求改名系统提示、按状态编辑及取消期限计分，本轮范围与验证见[P3_PRODUCT_REVISION.md](P3_PRODUCT_REVISION.md)；旧日期用例不能作为新要求。

2026-10-24。复验精确提交：**4839e770f2f95130ac1409f5cfaa980583469452**（codex/p3-implementation）。

结论：**J1–J10全部通过，10/10（100%），R1关闭**。P3实现已集成codex/p3-integration；待用户手动产品验收，main未合并，P4未开始。这是本地演示范围结论，不代表真实PostgreSQL多连接或云端通过。

## 环境与最终代码检查

在 `C:/Users/23678/.codex/workspaces/buckeye-baton-p3-review` 检出精确SHA，使用原已安装依赖、Node22、NEXT_TELEMETRY_DISABLED=1。测试仅用独立临时PGlite、本地mock与3206/3296端口；没有读取/复制用户.env、没有真实模型调用，没有使用P1/P2数据库。

| 检查 | 总控结果 |
|---|---|
| npm run typecheck | 通过 |
| npm run test:backend | 13/13，38.0s，含新增R1两项 |
| npm run build | 通过 |
| npm run test:e2e | 14/14，39.5s；自动启动next start生产服务器，含完整旧旅程与390px |
| 原R1独立探针 | 同一探针在原代码失败，本次两个场景均正确，工作台顺序与原因questionId均核对 |
| 代码与文案 | 精确微秒键内部WeakMap；同分按真实pendingSince/createdAt再按ID；普通API形状/ISO格式不变；日期提示文案已更正 |
| 差异与集成 | diff --check通过；契约/schema/package/lock无变化；协调分支集成后的src/db/scripts/tests/Playwright配置与被测SHA一致 |

查看本次390px Staff工作台截图，布局可用；完整桌面/移动、失败重试及四身份交互由同次Playwright运行覆盖。截图与探针源在 `C:/Users/23678/AppData/Local/Temp/buckeye-baton-coordinator-p3-4839e77/`（探针脚本在审查目录.data中，不属于应用源码）。前次CUA返回本地浏览器被Work设置禁用，本轮沿用项目Playwright，不修改浏览器设置。

## R1关闭依据

- 共用threads读取question/post时用数据库extract(epoch)得到微秒整数文本；priority模块以BigInt保存在以原QuestionThread对象为键的WeakMap，不增加可枚举响应字段或数据库列。
- pendingEvent仍使用已排好序、已过滤deletedAt的原帖子序列。比较器统一按score、精确pendingSince、精确question.createdAt、ID排序；工作台及项目选择最高分问题共用它。
- 场景A：无正式回复，z-earlier创建于`.000100Z`、a-later创建于`.000200Z`。工作台Priority/Oldest均为z-earlier在前，项目原因也指向z-earlier。
- 场景B：创建顺序和等待顺序相反，a-later的未回答追问早100微秒。Priority按a-later在前，项目原因指向a-later，Oldest仍保持原问题创建顺序。
- 新增API/SQL测试还覆盖pendingSince完全相同时比较精确createdAt，以及两种时间完全一致时按ID；旧API日期仍为毫秒ISO且不泄露createdAtUs。
- 总控重复运行前次相同探针，结果已保存为 [P3_TIMESTAMP_PROBE_FIXED.json](evidence/P3_TIMESTAMP_PROBE_FIXED.json)。原失败证据 [P3_TIMESTAMP_PROBE.json](evidence/P3_TIMESTAMP_PROBE.json)保留。实现方报告新增测试在旧代码失败；总控不再修改旧代码重复跑其新增测试，因为已有独立旧失败/新成功对照。

[P3_REVIEW.md](P3_REVIEW.md)的8/10保留为历史状态，以本报告为当前结论。

## 十项门槛

| 门槛 | 结果 |
|---|---|
| J1 Paused零后续共享年龄/边界 | 通过 |
| J2 有效帖子状态/等待周期/删除 | 通过 |
| J3 分值、期限边界与准确原因 | 通过 |
| J4 单最高问题聚合、过滤、稳定排序 | 通过，R1关闭 |
| J5 角色工作台优先排序、分组权限、兼容 | 通过，R1关闭 |
| J6 问题作者dueAt PATCH权限/校验 | 通过 |
| J7 正式页面原因、建议与写后刷新 | 通过 |
| J8 错误/输入保留、身份隔离、390px | 通过 |
| J9 P0/P1/P2四身份、AI回退、删除/负载/持久化 | 通过 |
| J10 最终SHA类型/后端/构建/start/e2e及证据 | 通过 |

## 保留的限制及下一步

真实PostgreSQL/Neon/AWS/公网/多实例均Not run；PGlite串行不证明真实多连接竞争。Paused年龄按createdAt共享时间，不声称暂停时间；权重是规则而非概率；日期编辑采用最后合法保存，没有版本锁。演示身份不是真实认证，P2生成锁仍是进程内。

3000/P1 PID25596、3001/P2 PID31004保留，原配置与数据库未改；这两个地址没有自动变成P3。此次仅启动了自动测试的临时生产服务器，测试后结束，**未启动P3用户产品预览**。P3下一步为独立产品预览与用户手动验收；未经明确授权不合并main、不进入P4。

用户手动验收步骤与预期结果见[P3_MANUAL_ACCEPTANCE.md](P3_MANUAL_ACCEPTANCE.md)，需先准备独立预览和隔离虚构样例；该清单尚未执行。
