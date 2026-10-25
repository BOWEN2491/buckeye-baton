# P3 契约：可解释排序与作者建议

2026-10-24。总控选定的首版实现规则，供单 Agent 实施及独立验收；数值是产品规则，不是经过流量实验训练的概率。**本文是计划，不是功能完成证明。** 基础为已通过全部产品验收的P2含删除补充d97920f；PR #3未合并，不能从旧main丢弃P2。

## 1. 范围

1. Explore projects提供 `Recommended` / `Newest`，默认Recommended；关键词、All/Ongoing/Finished/Paused仍可组合，展示每张卡的具体推荐原因。
2. Staff/Mentor工作台提供 `Priority` / `Oldest first`，默认Priority；保持现有分组与权限，显示等待、期望回复日期及优先原因。Mentor仍只看到分配给自己的问题。
3. 项目页展示与浏览一致的优先原因；所有者看到可行动建议。问题作者可修改/移除自己的期望回复日期。
4. 全部为服务器的确定性规则，按请求时刻计算；无AI、后台任务、曝光写入、邀请或新依赖，不增加数据库字段。刷新重新计算，不声称实时推送或实际流量提升。

不做：通知/自动站内邀请（P4）、AI Mentor推荐、自动引荐、忙闲评分、解决率、无解概率、问题关闭/删除、共同所有者或P2重新接入。保留P0/P1/P2所有功能，尤其AI源hash、正式回复/追问、删除和工作负载口径。

## 2. 两种时钟与资格

### 项目无人接棒

资格：**当前Paused且没有任何project_relations.sourceProjectId指向它的后续项目**。任何已有接棒关系都退出此项，不论后续项目状态。不把“上次有人接棒很久了”当作本轮条件。

没有pausedAt/状态历史；采用**项目createdAt以来的发布时间**，绝不把updatedAt或createdAt描述成“已暂停多久”。显示如 `Shared 14 days ago · no pickup yet`。如果项目很早发布、刚改Paused，可立即符合共享年龄规则，这是此首版的明确取舍，不伪造暂停时间或回填历史。离开Paused或出现第一个后续项目即去掉该加分，重新Paused按原createdAt计算。

### 问题待回复

资格只包括共用P1状态 `needs_referral` 或 `awaiting_reply`；discussion/replied无优先分，即使dueAt过期。Replied仅表示正式回复过，不表示问题已解决。

pendingSince：

- 仍无任何有效mentor_reply：question.createdAt。引荐发生不重置学生原等待时间。
- 存在有效mentor_reply且之后有未回答的follow_up：取**最后一条有效正式回复之后第一条有效follow_up**的createdAt。连续追问不把等待时间重新归零。
- 状态、最后回复与第一条追问均依据共用threads中SQL `createdAt,id`顺序，排除deletedAt非空帖子；不能客户端按毫秒Date重新排列来推状态。计算小时差可用ISO时刻；事件先后必须用服务器已确定次序。
- 删除回复/追问后根据剩余有效帖子重新计算；普通评论/感谢与项目资料编辑不改变pendingSince。修改dueAt也不改变pendingSince、不重新入队。

同请求捕获一次服务器asOf；elapsedHours=max(0,(asOf-start)/3600000)。完整天= floor(hours/24)，完整周=floor(hours/168)。测试注入固定clock或向纯计算函数传now；**生产API不接受客户端now/asOf作为规则时钟**。null日期不参与期限分。

## 3. 固定计分与稳定排序

### 单个待处理问题（0–80分）

| 条件 | 分数 |
|---|---|
| 等待年龄 | min(30, 5 × 完整等待天数) |
| dueAt已到或过期（dueAt <= asOf） | +50 |
| 未来24小时内（0 < diff <= 24h） | +35 |
| 未来72小时内（24h < diff <= 72h） | +20 |
| 大于72h或无dueAt | +0 |

期限三档互斥；等待与期限可相加，不按帖子数量加分。准确用小时比较，不能把显示的本地日期当排序依据。过期标签为 `Reply date passed`，不能说项目过期或必然无法得到解答。

### 项目推荐（0–100分）

1. 合资格的无人接棒Paused项目：`min(20, 5 × 完整发布周数)`，不足7天为0。
2. 项目中全部合资格问题，取**单个最高分问题**的分数，加到第1项。避免问题多就堆分，不能拿A问题等待分+B问题期限分拼出不存在的问题。
3. 最高分问题并列：pendingSince升序、question.createdAt升序、question.id字典升序；仅该问题提供项目级原因。最高问题分0时不添加无意义原因。项目得分最高100，不再二次倍率/隐藏权重。
4. 所有匹配项目仍显示，包含0分项目。先关键词/状态过滤，再按全体有效关系/问题计算其分数并排序；不要只在当前过滤结果中数后续项目。

项目Recommended顺序：score降序 → project.createdAt降序 → id字典升序。Newest：createdAt降序 → id升序。时间并列应尽可能保留DB原精度/稳定序，不引入随机次序。

工作台Priority：有待处理状态的在前，score降序 → pendingSince升序 → question.createdAt升序 → question.id升序。已回复等非待处理条目在后，沿createdAt,id升序。Oldest first保持既有createdAt,id升序。不跨分组移动条目；Staff的Referred仍包含所有已引荐问题，已回复不会消失。

## 4. 共用类型与API

新增 `src/shared/p3-types.ts`，复用既有BrowseProject/QuestionThread/Workbench；新字段不塞入ProjectInput，也不参与AI sourceHash。可按契约定义等价的内部实现。

```ts
type PriorityReasonCode = 'no_pickup' | 'waiting_for_reply' | 'reply_due_soon' | 'reply_overdue';
interface PriorityReason {
  code: PriorityReasonCode;
  label: string; // 服务器生成的英文纯文本，准确说明规则
  points: number;
  questionId: string | null; // 项目无接棒原因=null，其余链接到具体问题
}
interface QuestionPriority {
  score: number;
  pendingSince: string;
  waitingHours: number;
  reasons: PriorityReason[];
  asOf: string;
}
interface ProjectPriority { score: number; reasons: PriorityReason[]; asOf: string }
interface RecommendedProject extends BrowseProject { priority: ProjectPriority }
interface PrioritizedThread extends QuestionThread { priority: QuestionPriority | null }
interface PrioritizedWorkbench {
  needsReferral: PrioritizedThread[];
  referred: PrioritizedThread[];
  awaitingReply: PrioritizedThread[];
  replied: PrioritizedThread[];
}
type AdviceCode = 'improve_handoff' | 'narrow_question' | 'review_reply_date';
interface OwnerAdvice {
  code: AdviceCode;
  message: string; // 中性建议；不虚构概率或保证
  questionId: string | null;
}
interface ProjectPriorityDetail {
  projectId: string;
  priority: ProjectPriority;
  questions: { questionId: string; priority: QuestionPriority | null }[];
  advice: OwnerAdvice[];
}
```

| API | 行为 |
|---|---|
| GET `/api/projects?q=&status=&sort=recommended` | public，200 `{data:RecommendedProject[]}`；与P2同样保留introduction及回退 |
| GET `/api/projects?sort=newest` 或不传sort | 原兼容形状200 `{data:BrowseProject[]}`，原查询语义；加稳定id并列规则 |
| GET `/api/workbench?sort=priority` | 原角色权限，200 `{data:PrioritizedWorkbench}`，仍只有四个数组键，非待处理priority=null |
| GET `/api/workbench?sort=oldest` 或不传sort | 原兼容Workbench响应与顺序 |
| GET `/api/projects/:id/priority` | public，200 `{data:ProjectPriorityDetail}`；未知项目404，不含草稿、删除正文或身份秘密 |
| PATCH `/api/project-questions/:id` | 问题所属Student，严格输入 `{dueAt: string|null}`，200 `{data:QuestionThread}`，不新增priority字段 |

不支持的sort（含空sort）返回400 INVALID_INPUT，不静默回退。默认旧API调用无需改；旧Project详情响应顶层四键保持不变，不为P3改成新wrapper。项目内原问题GET及所有写入响应仍用原QuestionThread，无需增加可选业务字段；P3元数据由priority端点或opt-in workbench提供。

沿用统一 `{data}` / `{error:{code,message}}`。priority GET是公开既有事实的计算，不写数据库。PATCH必须验证demo身份、记录存在、学生且authorId归属：无效/缺身份401，未知问题404，其他身份403；项目所有者不因管理项目获得修改他人问题日期的权限。输入只含dueAt，空对象、额外title/body/wantsMentor/id等400。日期沿既有规则：有效未来UTC ISO Z或null；过去/当前时刻400。在短事务内检查/更新，原body、author、createdAt、帖子、引荐、项目及AI内容不变；多标签日期编辑采取最后一次合法保存生效，不宣称版本锁。

日期沿现有本地日历日23:59转换为UTC的UI约定；保存时服务端未来日期校验为准。null显式移除期限。成功后刷新当前问题/priority/相关工作台资源；失败保留输入并可重试。修改日期不改P1状态或负载，不通过重建问题来模拟修改。

## 5. 文案与建议触发

原因仅列实际加分项，顺序为项目no_pickup、问题waiting_for_reply、该问题期限项；points相加必须等于score，不能解释A却按B排序。0分可用 `No priority boost` 中性说明，不标“低价值”。不要公开AI模型或内部草稿。展示 `Updated ...` / Refresh，不暗示实时监控。原因可链接到 `#q-<id>`，无障碍可展开查看全部原因和规则；卡片可先显示前两项。

建议由服务器基于同一asOf推导，去重并稳定排序：

- Paused无接棒且发布至少14天：improve_handoff，建议补充可复用材料、明确接棒目标；所有者点击 `Edit project` 进入既有编辑页。不是发送通知。
- 任一待处理问题等待至少3天：narrow_question，建议缩小问题、补充可复现背景，链接该问题；使用既有讨论补充，不新增修改问题正文接口。
- 任一待处理问题dueAt <= asOf+24h（含过期）：review_reply_date，建议检查期望回复日期、必要时延长或移除；链接具体问题。仅问题作者显示实际日期编辑按钮；项目所有者若不是提问者只能阅读建议，不能代改。

项目页Owner advice仅对当前项目所有者显示；公开priority API只给通用建议与已公开问题ID，没有私有用户行为。问题作者在任意状态项目的自己的问题旁始终可点 `Edit reply date`，即使没有触发建议；Staff/Mentor与其他学生不显示该按钮。没有建议时有清楚空状态。不提示“你很可能收不到solution”，不显示虚构概率、匹配成功率、曝光/点击数或假的邀请已发送。

## 6. 实施依据与反例

Phase0事实发现已读现有代码，以下是允许复用的真实接口，而非臆造SDK：

| 位置（当前基线） | 复用/保护 |
|---|---|
| src/server/relay.ts:52–78 threadState/threads | 共用状态与删除过滤；可提取服务供priority读，不另写状态机；保留SQL微秒顺序 |
| src/server/relay.ts:134–155 workbench/mentorWorkload | 沿用原分组、不同问题计数；新增排序不可污染负载 |
| src/server/api.ts:14–18 projects/project读取 | opt-in sort，保留P2批量browseProjects投影、老数组响应 |
| src/server/introductions.ts:19–40 | sourceFields不因priority、dueAt或时间变动而改变；browseProjects保留传入顺序 |
| src/server/http.ts:6–18 | actor/role/parse/json/fail；PATCH校验作者，不误用ownProject |
| src/app/api/project-questions/[id]/posts/route.ts | Node runtime、force-dynamic、Next15异步params；新增question PATCH相同模式 |
| src/app/page.tsx:16–65，components/ui.tsx:68–128 | 搜索状态与ProjectCard；新排序入口，保留原内容及AI回退 |
| src/components/workbench.tsx:12–77 | 仅四数组键，按opt-in类型渲染；保留角色队列及候选workload |
| src/components/project-questions.tsx:29–35 | 本地日期转UTC模式；保存后reload，不用毫秒排序重算帖子状态 |
| src/lib/client.ts:8–60 | api(path,userId,body,method)、useResource/reload、切换用户及过期响应隔离 |
| tests/post-deletion.test.ts，tests/backend.test.ts:13–15 | 隔离SQL、finally close、新测试import到真正入口 |
| playwright.config.ts:6–45 | 生产start、临时库和mock；保护3000/3001，明确空闲端口 |

不要新增pausedAt迁移/回填、不以updatedAt当暂停时间；不重建现有表；不从legacy讨论/采用记录计算P3；不让P3 GET调用AI、发通知、写曝光日志或保存score。批量加载关系和threads，不每卡片/问题发一套SQL。分值/排序/建议只有一个服务器模块，前端不复制规则。测试数据冻结时间，浏览器用可控相对时间/服务响应核对，不依赖等一天。

## 7. 验收边界

实现方需验证阈值前/正好/后：7/14/28天发布，1/3/6天等待，24/72小时及dueAt恰好等于asOf；未来createdAt夹0、null期限、同分稳定、同项目多问题只取max、过滤不影响关系计数。删除/追问/引荐/回复/日期更新均重新读取并比对工作台与Mentor负载。

测试仅用隔离PGlite与P2现有mock。无需新key或真实模型调用；已有真实AI证据保持。真实pg/Neon/AWS/公网/多实例未运行必须Not run，不把本次规则测试当云端证据。十项门槛及交付格式见P3_AGENT_TASK.md。
