# P1 共用契约与范围

2026-10-24产品验收补充：用户已授权项目所有者/评论作者删除项目内评论，规则见[COMMENT_DELETION.md](COMMENT_DELETION.md)，取代下文对帖子删除的原始排除；其他P1规则保留。

2026-10-24。这是本轮协调契约；尚未实现的端点不能标为运行接口。沿用 API_CONTRACT.md 的 {data:...}/{error:{code,message}}、英文消息、demo header、错误状态与所有者校验。
P1 由一个全栈 Agent 连续实现。先在 src/shared/relay-types.ts 实现下列公共类型，再实现数据、接口和页面；无需单独提交类型供另一个 worker 同步。契约语义变更仍由总控协调。已有 User、Project、ProjectReflection、Lesson 引用 src/shared/types.ts，不重复定义。完整任务见 P1_AGENT_TASK.md。

## 规则

- P1 单所有者；所有学生可从 Finished/Paused 接棒，包括原所有者，Ongoing 不提供接棒创建。
- 接棒只创建关联的新 Ongoing，不修改来源、不复制成原团队之外的成果；代码和材料仍为外部链接。
- 接棒 goal 是“创建时目标”，保存于关系记录；新项目 summary 初始使用该目标，后续普通项目编辑不重写来源记录。
- source 课程/学期/tags 沿用为初始资料，所有者之后可编辑；不自动复制代码/演示链接。
- 仅 Student 提问，四身份可普通评论。问题作者可发送明确 follow_up，只有引荐的 Mentor 能发送 mentor_reply。
- wantsMentor=false 是开放讨论，不进入待引荐；P1 不提供事后切换。普通评论不触发 Mentor 待回复，follow_up 才触发。
- dueAt 可空，为求助希望得到回复的时间，API 使用 ISO UTC，页面按浏览器本地时区显示。新建时若填写须为未来时间；本轮不做延期或自动提醒。
- 三种项目状态均可讨论，状态改变不关闭问题。P1 不增加“已解决”按钮，replied 只表示回应过，不代表解决。
- 每问题最多一条引荐，不自动继承 Mentor，不转派。指定 Mentor 可多次正式回复。
- 不做帖子编辑/删除、共同所有者、内容逐项带入、AI、负载排名、推荐或邀请。
- 新表采用 project_ 前缀，与保留的 lesson 历史表隔离；不得把旧问题伪装成新项目问题，不删除原始记录。

## 共用类型语义

- PickupType = reproduce | continue | improve
- PickupInput = {requestId:string, pickupType:PickupType, title:string, goal:string}
- RelayLink = {project:Project, owner:User, pickupType:PickupType, goal:string, pickedUpAt:string}
- RelayProjectDetail = {project:Project, lessons:Lesson[], source:RelayLink|null, successors:RelayLink[]}
- ProjectQuestion = {id,projectId,authorId,title,body,wantsMentor:boolean,dueAt:string|null,createdAt:string}
- ProjectPost = {id,questionId,authorId,body,kind:comment|follow_up|mentor_reply,createdAt:string}
- ProjectReferral = {id,questionId,staffId,mentorId,reason,createdAt:string}
- QuestionThread = {question:ProjectQuestion,author:User,posts:(ProjectPost & {author:User})[],referral:(ProjectReferral & {staff:User,mentor:User})|null,state:discussion|needs_referral|awaiting_reply|replied}
- Workbench = {needsReferral:QuestionThread[],referred:QuestionThread[],awaitingReply:QuestionThread[],replied:QuestionThread[]}
- QuestionInput = {title:string,body:string,wantsMentor:boolean,dueAt:string|null}
- PostInput = {body:string,kind:comment|follow_up|mentor_reply}
- ReferralInput = {mentorId:string,reason:string}（新文件类型命名 ProjectReferralInput，避免冲突旧 ReferralInput）

## 端点

| 方法/路径 | 输入 | data |
|---|---|---|
| GET /api/projects/:id | — | RelayProjectDetail，替代原 ProjectDetail 返回；已有 project/lessons 保留 |
| POST /api/projects/:id/pickups | PickupInput | RelayProjectDetail（新项目） |
| GET /api/projects/:id/questions | — | QuestionThread[] |
| POST /api/projects/:id/questions | QuestionInput | QuestionThread |
| POST /api/project-questions/:id/posts | PostInput | QuestionThread |
| POST /api/project-questions/:id/referral | ProjectReferralInput | QuestionThread |
| GET /api/workbench | demo identity header | Workbench |

- Questions GET 为公开读取，POST 需 Student；posts 权限按规则。Workbench 只允许 Staff/Mentor，另一角色的数组为空。
- Questions 以 createdAt 升序，posts 同样升序并以 id 稳定排序。
- Staff needsReferral 为 wantsMentor 且无引荐，referred 为已引荐；Mentor 仅返回分配给自己的问题。
- state=discussion 若 wantsMentor=false；否则无引荐为 needs_referral；有引荐且尚无正式回复，或最后一次明确追问晚于最后正式回复，为 awaiting_reply；其余 replied。比较使用稳定顺序，不以任意最后评论作者判断。
- 接棒 requestId 为 UUID，数据库按(ownerId,requestId)唯一，事务保存关系与新项目。相同 key+相同输入返回同一结果；相同 key+不同输入返回409。成功首次201，重试200。
- 引荐并发唯一约束(questionId)，重复409且不多写；回复保存与队列状态推导一致，不用旧 completed 状态禁止再次回复。
- 标题 trim 后1–160；goal/问题补充/帖子沿用现有正文最大10000；问题标题1–160，body可空；引荐理由1–300；日期非法400；非法角色403、无身份401、缺记录404。
- 状态与分页规模先沿用演示级列表；不得引入额外依赖。未来高容量策略属于后续范围。

## 设计落实

参考 design/relay 的接棒表单、问题线与工作台。去掉紫色演示控制条以及本轮未批准扩展；不要恢复 Lesson 或采用面板。接棒表单使用方式、新名称、目标和来源只读参考；成功后进入新项目详情，显示来源关系。
Staff 工作台显示 Needs referral / Referred；Mentor 显示 Awaiting reply / Replied。正式回复有 Referred mentor reply 标识，普通评论不伪装正式回复。
