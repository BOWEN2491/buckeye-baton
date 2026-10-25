# P3 手动产品验收清单

**产品修订后请只复验这三项：** 系统提示现名Suggestions for your project（入口不变，不编辑系统提示本身）；Edit project切Ongoing/Finished/Paused只出现对应字段，切回来未保存输入和已保存历史都保留；项目/求助仅按发布等待年龄排序，没有日期输入、期限加分或延长期限建议。旧日期保留但不参与排序。详见[P3_PRODUCT_REVISION.md](P3_PRODUCT_REVISION.md)。下文TC03、期限分与分数表仅保留为旧版历史，不再执行；用户已确认其他功能通过。

适用代码：4839e770f2f95130ac1409f5cfaa980583469452（已集成codex/p3-integration）。总控独立技术验收10/10；**以下是用户产品验收，尚未执行，不因文件存在自动通过**。

## 执行前

**当前P3预览已启动：http://127.0.0.1:3000，实际SHA为4839e770f2f95130ac1409f5cfaa980583469452。** 用户已要求停止旧P1/P2服务，3001现已停止；旧库保留。使用独立验收库，无真实模型或mock，AI生成未启用。运行详情见[P3_PREVIEW.md](P3_PREVIEW.md)。

下表虚构样例已在独立验收库准备完成，可直接操作。现有普通seed不含“发布40天”的项目；**不要修改原P1/P2数据制造年龄**。这里仅在独立验收库预置日期，用户不需要改数据库或真的等待10天。

| 标记 | 起始内容 |
|---|---|
| P | Alex的Paused项目 `Study Room Finder Pilot`，发布40天，没有任何后续项目；含暂停原因/重做建议/材料 |
| Q-Wait | Mia在P下的问题 `How fresh must room data be before students trust it?`，发布10天，请求Mentor，无dueAt、无引荐/回复 |
| U | Mia的Ongoing项目，例如 `Campus Events` |
| Q-Urgent | Mia在U下的新问题 `P3 manual: urgent question`，请求Mentor，期望回复时间为预览准备时刻之后12小时，无引荐 |
| F | 一个Finished项目，当前没有待处理问题；用于0分/筛选检查 |

P初始50分（共享年龄20+等待30）；Q-Wait自身30分；Q-Urgent自身35分。**所以Explore中P可排在U前，Staff工作台中Q-Urgent却应排在Q-Wait前**，因为问题队列不加项目无人接棒分。其他既有样例可能排在它们之间，只比较指定项目/问题的相对顺序，不要求全站固定名次。

准备时确认目标样例未被自动浏览器测试或之前手动流程改变。重复验收应另用一份隔离样例，不能把“已有人接棒”的同一个P当作零后续起点。四个身份切换后都回Explore，需要再打开项目或My workspace。

## 建议按顺序操作（约15–20分钟）

### TC01 — 首页推荐、排序与筛选

1. 打开已确认版本的P3预览；观察默认选中Recommended。
2. 找到P，检查原因含 `+20 Shared 40 days ago · no pickup yet` 与 `+30 Waiting 10 days for a reply`。卡片没有“已暂停40天”的说法。
3. 查看F，0分项目仍在，显示 `No priority boost`。
4. 在相同搜索/筛选条件切Newest，再切Recommended：结果集合/数量相同，顺序可变；Newest按实际发布时间，不应凭优先分排序。
5. 搜索 `Study Room`，切Paused应找到P，再切Finished应无匹配；清空后恢复。
6. 展开How priority works，规则能读懂；Updated/Refresh可用。点击卡片的问题原因应进入对应项目的具体问题。
7. 在尚未修改日期前切Kevin → My workspace，检查Priority把Q-Urgent（35）排在Q-Wait（30）前；切Oldest first则Q-Wait在前。两种排序条目集合/数量不变。后续TC03改日期后，Q-Wait会增到50并在Priority中超过Q-Urgent，这是预期变化。

**通过**：排序有解释、筛选可组合、无结果提示清楚、0分项目可访问。若验收跨过整天边界，标签的天数可能增长，分值按规则封顶，不把正常时间推进当bug。

### TC02 — 所有者建议与权限

1. 切Alex，打开P。看到Recommended because与Owner advice。
2. 建议应包含补充交接材料/接棒目标、缩小久等问题或补充背景。
3. 点Owner advice的Edit project，能进入现有项目表单；点Cancel editing返回，不改变内容。
4. 点Go to the question，定位Q-Wait。
5. Alex是项目所有者，却**不能看到Q-Wait的Edit reply date**，因为提问者是Mia。
6. 切Mia再开P：没有Alex的Owner advice，但Q-Wait有Edit reply date。Staff/Mentor同样不能代改Mia的日期。

**通过**：项目管理权与问题日期修改权区分清楚，建议链接能实际使用。

### TC03 — 回复日期保存、移除及刷新

1. Mia在Q-Wait点击Edit reply date，先选约7天后的未来日期并Save date。
2. 日期显示、成功提示及刷新持久都正确；因为大于72小时，不应新增期限加分。P仍约50分。
3. 再编辑，选择距当前**24–72小时**的日期（通常2天后，UI按本地当天23:59保存）。Save date后问题/项目面板均出现 `Reply date within 3 days`，问题加20，P变70分。
4. 刷新页面仍保留；点击Remove date，期限消失，P回50分。
5. **为后续流程，再保存24–72小时内的日期**，让P回70分；此后不要移除该日期。
6. 可选：编辑后Cancel，不应保存；尝试过去日期或留空后Save应被拒绝，不能默默保存错误值。明确移除需用Remove date。

**通过**：只改日期，不改变问题正文、作者、引荐或待回复状态，也不把等待10天归零。修改日期可能改变Priority顺序；不代表改变导师归属。

### TC04 — Staff工作台排序与引荐

1. 切Kevin → My workspace → Needs referral。
2. 默认Priority。Q-Urgent（35）应在Q-Wait（30+20=50）之后，因为TC03已把Q-Wait加到50。若在TC03前做此项，则应是Q-Urgent35在Q-Wait30之前。
3. 切Oldest first，按实际提问时间排列；切换前后仍是相同问题集合，计数不变。
4. 记录Sarah的Awaiting reply为N（不强求为0）。
5. 打开Q-Wait，Refer a mentor → Sarah → 填理由 → Send referral。

**通过**：问题从Needs referral移到Referred；Sarah负载N→N+1，原等待年龄不重置，P仍70分。其他问题的状态不应因这一条引荐改变。

### TC05 — Mentor回复清除待回复加分

1. 切Sarah → My workspace → Awaiting reply，找到Q-Wait。
2. Sarah不应看到尚未引荐给她的Q-Urgent；能看到Staff引荐理由。
3. 进入Q-Wait，在Reply as the referred mentor填写实际建议，点击Post mentor reply。
4. 看项目面板、再看工作台；必要时点Refresh。

**通过**：Q-Wait变Replied，等待30及期限20均不再加分；P只剩无人接棒20。Sarah待回复数量回N，原引荐与评论保留。Replied不等于平台保证问题已解决。

### TC06 — 感谢与明确追问的区别

1. 切Mia，在Q-Wait发 `Thanks!`，点Post comment。
2. P仍20分，Sarah负载仍N，问题仍Replied。
3. 再发一个具体新问题，点Post follow-up。
4. 看问题状态、原因与工作台。

**通过**：重新Awaiting reply，Sarah回N+1；等待从本次追问开始，不再显示Waiting 10 days。日期仍在24–72h内时，问题期限20+项目无人接棒20，P为40分。连续追问不通过“发得多”额外加分，也不重复增加Mentor问题数量。

### TC07 — 删除正式回复后重新计算

1. 切Sarah，对追问再发一次正式回复：P回20分，负载回N。
2. 切Alex，找到Sarah**最新的第二条正式回复**，点Delete。
3. 先取消确认：回复应保留，状态/分数/负载不变。
4. 再Delete并确认，刷新页面。

**通过**：最新回复消失，第一次回复、追问和引荐仍在；Q-Wait重新等回复，Sarah回N+1；保留24–72h期限时P回40分。普通其他学生不能删除Sarah评论；项目所有者和评论本人有删除权。

### TC08 — 接棒移除无人接棒加分

1. 切Mia，P → Pick up this project → Continue，填新项目名/目标并Create project。
2. 新项目是Mia的Ongoing，显示来源P。
3. 返回原P，检查Picked up by (1)、暂停经验、问题和引荐。
4. 看Recommended because，再回Explore搜索P；点Refresh。

**通过**：原P仍归Alex、仍Paused；不再显示no pickup yet，移除20分；此时Q-Wait仍待回复且期限在24–72h内，则P只剩期限20分。后续项目状态不决定是否算“有人接棒”，建立关系后该加分即退出。

### TC09 — 身份、刷新与手机布局

1. 先在首页设置搜索/状态筛选/Newest，切换身份。
2. 应回到未筛选Explore，默认Recommended，不残留上个身份的表单和权限按钮。
3. 刷新：日期、讨论、引荐与接棒关系仍在。
4. 用约390px手机宽度检查Explore、项目详情、Staff/Mentor工作台。

**通过**：无横向滚动或遮挡，排序/Refresh/日期按钮可点击，长原因可读，身份入口仍可用。手机项目页推荐面板可能在主内容下方，不要求桌面侧栏位置。

### TC10 — 可选失败恢复（浏览器支持Network Offline时）

1. 在已打开的项目详情/工作台，将浏览器Network设为Offline，点Refresh；也可在修改日期时断网后Save。
2. 不要退出或重启应用来制造失败，更不要停止3000/3001。
3. 恢复Online，点页面提供的Retry/Refresh，或重试保存。

**通过**：有错误反馈；若保留旧结果，应说明刷新失败，不能把加载失败当0分/0负载；日期保存失败保留输入，恢复后可重试。浏览器不便模拟时可写Skipped，此路径已在自动化中覆盖，不必手工伪造服务器故障。

## 关键分数速查（仅针对上述P和Q-Wait）

| 阶段 | 项目无人接棒 | 问题等待 | 问题期限 | P总分 |
|---|---:|---:|---:|---:|
| 起始：共享40天、问题等10天、无期限 | 20 | 30 | 0 | 50 |
| 设24–72h期限，尚未回复 | 20 | 30 | 20 | 70 |
| 第一次正式回复/普通感谢 | 20 | 0 | 0 | 20 |
| 新追问（不足1天） | 20 | 0 | 20 | 40 |
| 第二次正式回复 | 20 | 0 | 0 | 20 |
| 删除第二次回复 | 20 | 0 | 20 | 40 |
| Mia接棒后 | 0 | 0 | 20 | 20 |

日期若已进入24h内，期限分是35；已到期是50。不是相加多档。上述总分前提是没有另外更高分的待处理问题；一个项目只取单个最高分问题，不把多个问题分数累加。

## 不需要手动重做

微秒排序R1、精确24/72h阈值、非法API身份/额外字段、数据库迁移重启等已有独立自动化与探针证据；不需要用户用肉眼模拟100微秒或直接操作数据库。P3不需要点击Generate introduction或消耗真实AI额度。自动邀请属于P4，没出现邀请不是本轮缺陷。

## 一次反馈即可

```text
P3 手动验收：通过 / 需修改
实际预览地址与运行SHA：
用例：TC01–TC09 <通过/失败项>；TC10 <通过/失败/Skipped>
问题（如有）：所在页面 + 当前身份 + 操作 + 实际结果 + 期望结果
截图：仅失败或交互不清楚时提供
```

用户确认产品通过与授权合并main分别记录。本清单没有给出合并授权，没有改变P4状态。
