# Buckeye Baton：接棒与“问题—引荐—回复”交互说明

HackOHI/O 2026 · Honda challenge · 交互设计 v1（供开发实现）

本说明描述 **Project 为核心** 的新方向下的两段交互：

- **A. 接棒表单**
- **B. 问题—引荐—回复**

所有人物、项目、数据均为**虚构示例**，不代表真实成效。

---

## 0. 文件与使用方式

| 文件 | 内容 |
|---|---|
| `index.html` | 演示故事索引：按顺序打开 13 个画面，并列出边界状态的链接 |
| `alex-paused.html` | Alex 的 Paused 项目（来源项目）；可切换“接棒前/后”和查看角色 |
| `baton-form.html` | **交付 A** 接棒表单；可切换来源（Paused / Finished / Ongoing）和提交结果（成功/失败） |
| `picked-up.html` | 接棒成功后第一次打开的新项目页：左边是来源项目的内容，右边是自己的项目，可以选择性带入（§4.8） |
| `mia-ongoing.html` | Mia 的 Ongoing 项目；**交付 B** 的 7 个画面（第 0–6 步）、5 种查看角色、失败与冲突、项目状态变化 |
| `workbench.html` | Staff 工作台、Mentor 工作台 |
使用说明：
- 双击任一 HTML 即可在浏览器打开，不需要服务器。样式写在每个文件内部，单独打开也能正常显示。页面支持深色模式和手机宽度。
- 视觉风格沿用 `design/cards/` 的颜色、字体和圆角。
- 页面顶部紫色虚线区域是**演示控制条，不属于产品界面**。它用于切换步骤、角色和模拟失败。
- 点 “Fill sample text” 可以填入本说明第 8 节的示例文案。

---

## 1. 本次范围（以本说明为准）

### 1.1 保留并实现
- **Project 是核心对象。** 经验直接写在项目下面，按状态分为三组字段，见 §2。
- 成果通过外部链接展示：GitHub、演示、文档。
- **接棒**：三种方式（Reproduce / Continue / Improve），共用一个表单，结果是创建一个新的 Ongoing 项目。
- 一个项目可以有**多个问题**。每个问题有自己的引荐记录和**平铺**回复列表（不做嵌套）。
- **Finished、Paused、Ongoing 三种状态的项目都可以接棒**，也可以直接从首页 Feed 的项目卡片接棒。
- 接棒后的新项目页**并排显示来源项目的内容**，学生可以选择性带入（描述、目标、链接），带入后可以随意编辑（§4.8）。
- **Mentor 跟着项目走**：来源项目有 Mentor 的，接棒后的新项目默认由同一位 Mentor 继续指导，提问时可以直接发给这位 Mentor，不需要 Staff 引荐。
- 提问时选择**是否需要 Mentor 回答**。选“需要”的问题进入 Staff 引荐流程；选“不需要”的问题是开放讨论，Staff 不需要处理。
- 作者可以**编辑或删除自己的帖子**。
- **Staff 人工选择 Mentor 并填写引荐理由**。Staff 工作台和 Mentor 工作台。
- 角色只有 **Student / Mentor / Staff**。

### 1.2 本次明确不做（不要从旧文档带回）

| 不做 | 旧出处 |
|---|---|
| Lesson 作为独立的发布、搜索、采用对象 | `PASS_IT_ON_PLAN.md`（`codex/pass-it-on-plan` 分支）§2 “Lesson 是核心”、§3.1、§5.3、§6 中的 `Lesson` / `LessonStatusEvent` |
| 逐条经验的 “Add to project”、采用统计、worked / partial / failed 反馈 | 同上 §2.4、`Adoption` 表；`design/cards/*.html` 右上角 “Adopted by N projects · M worked”、每个问题框里的 “Adopted by N” |
| AI 项目简介、AI 问题分类、AI 推荐 Mentor、AI 起草引荐理由 | `design/cards/IMPLEMENTATION.md` §6 全部；`ongoing.html` 的 “AI-classified” 分类标签、“AI summary · confirmed by team” 标注 |
| 真实通知（邮件、推送、站内通知中心） | 工作台列表代替通知 |
| 站内代码编辑、完整 Git fork、复杂接力关系图 | 接棒只记录 “来源 → 后续” 一层链接 |
| Alumni、Faculty、Staff Connector 等角色名 | 统一称 **Staff** |
| Mentor 发布项目 | Mentor 只回复和评论；项目都由学生发布 |
| 接棒后页面上的“我的计划”清单 | 不做 |

`design/cards/` 三个 HTML 只沿用**内容结构和视觉风格**，上表列出的元素一律忽略。`design/feed/` 本次不处理（§9.1 第 12 条）。

---

## 2. 项目页

### 2.1 各状态显示的内容

| 状态 | 必显示 | 由谁填写 |
|---|---|---|
| 公共部分 | 名称、所有者（可以多人）、学期、状态标签、状态历史、简介（学生填写）、外部链接、**来源项目**（如果是接棒创建的）、**Picked up by**（后续项目列表）、**Questions** | 所有者 |
| Ongoing | 目标、进展（按日期排列的更新列表）、问题 | 所有者 |
| Finished | 成果（含链接）、遇到的问题与解决方式、给下一组的建议 | 所有者，标记为 Finished 时填写 |
| Paused | 暂停原因、如果重来会怎么调整、可复用材料（含链接） | 所有者，标记为 Paused 时填写 |

### 2.2 规则
- **只有项目所有者**能修改项目资料和状态。按钮：`Edit project`、`Change status`。Ongoing 时还有 `Add update`。
- **改变状态时，新状态的字段直接覆盖旧状态的字段**，页面只显示当前状态的内容。例如 Ongoing → Paused 后，目标和进展不再显示，由暂停原因等字段取代。
- **问题、引荐和回复不受影响，全部保留。** 状态历史（例如 `Ongoing Oct 26 → Paused Dec 4`）也保留。
- 三种状态之间可以互相切换，包括 Paused 或 Finished 改回 Ongoing。所有者点 `Change status`，在面板中选择新状态，填写新状态的必填字段，确认后生效：

  | 目标状态 | 必填 | 选填 |
  |---|---|---|
  | Ongoing（恢复） | Goal | — |
  | Paused | Why are you pausing? / If you did it again, what would you change? | What can the next team reuse? |
  | Finished | What we got / Problems and how you solved them / Advice for the next team | — |

  - 面板会提示：`This replaces the current <状态> content on the project page (...). Questions, replies and the status history stay.`
  - 按钮文案为 `Mark as <状态>`，提交中显示 `Saving…`。失败时提示 `Couldn't change the status. Your answers are kept. Try again.`
- 状态变化**不自动关闭**任何问题。Finished 和 Paused 项目仍然可以提问、评论、引荐和回复。
- Questions 区块在三种状态下的位置和行为相同。非 Ongoing 时，在区块顶部显示一行说明：
  > This project is Paused. Questions, referrals and replies below are kept as they were, and stay open for discussion.
- “Picked up by” 列出后续项目：名称、所有者、接棒方式、状态、创建日期，点击进入该项目。没有后续项目时显示 “No one has picked up this project yet.”
- 来源行格式：`Picked up from <来源名称> <来源状态> by <来源所有者> · <接棒方式>`，点击进入来源项目。

---

## 3. 角色权限总表

| 操作 | Student（所有者） | Student（其他） | Mentor | Staff |
|---|---|---|---|---|
| 修改项目资料、状态，添加进展 | ✓（所有共同所有者） | — | — | — |
| 接棒（Finished/Paused 项目上的 `Pick up this project`） | ✓（可以接棒自己的项目） | ✓ | — | — |
| 提出新问题（`Ask a question`） | ✓ | ✓ | — | — |
| 在问题下追问（Follow-up） | ✓（标 “Follow-up”） | — | — | — |
| 在问题下普通评论 | — | ✓（标 “Comment”） | ✓（未被引荐时） | ✓ |
| 引荐 Mentor | — | — | — | ✓（每个问题一次） |
| 被引荐 Mentor 的正式回复 | — | — | ✓（仅被引荐者） | — |
| 编辑、删除自己的帖子 | ✓ | ✓ | ✓ | ✓ |
| 工作台 | — | — | “To reply” / “Replied” | “Needs referral” / “Referred” |

---

## 4. 交付 A：接棒表单（`baton-form.html`）

### 4.1 入口与跳转
- **入口**：
  - 项目页上的 `Pick up this project`。Finished 和 Paused 放在页面底部，Ongoing 放在标题区下方。
  - 首页 Feed 项目卡片上的 `Pick up`。
  - 所有 Student 都能看到，包括项目所有者。
- 跳转到 `/projects/<source_id>/pick-up`，三种状态共用同一个表单。
- 接棒 Ongoing 项目不影响原团队，他们继续做自己的项目，不需要原团队同意。

### 4.2 页面结构
1. 顶部返回链接：`← Back to <来源名称>`
2. 标题 `Pick up a project`，来源行：`From <来源名称> <状态> by <所有者>`，以及说明 `You'll start your own Ongoing project linked to this one. The original project is not changed.`
3. 表单字段（见 4.3）
4. 说明框：`Next, your project opens beside <来源名称>'s content. Bring in whatever helps and edit it as your own. <来源名称> will list your project under "Picked up by"`。来源为 Ongoing 时，后面加 `, and its team keeps working on theirs`。
5. 按钮：`Cancel`、`Create project`
6. 右侧（手机上显示在表单下方）是**只读参考**，默认展开，可折叠：
   - 来源为 Paused 时：暂停原因、如果重来、可复用材料链接、Where to start
   - 来源为 Finished 时：成果链接、问题与解决方式、给下一组的建议
   - 来源为 Ongoing 时：目标、最新进展、链接
   - 每种来源都显示 Mentor 一行：有 Mentor 的写 “<Mentor> mentored this project and will continue with yours.”；没有的写 “None on this project. If you ask for a mentor, Staff will refer one.”
   - 表单里不做带入操作；带入在下一页进行（§4.8）。

### 4.3 字段

| 字段 | 必填 | 控件 | 规则 | 校验失败文案 |
|---|---|---|---|---|
| 接棒方式 `baton_type` | 是 | 三选一卡片 | `Reproduce`：Rebuild what they made, to learn how it works or to check it still works. `Continue`：Keep going on the parts they didn't finish. `Improve`：Make one feature or method better. 默认不选中 | Choose how you're picking it up. |
| 新项目名称 `title` | 是 | 单行输入 | 去掉首尾空格后 1–80 字符；显示计数 | Enter a project name. |
| 本组目标 `goal` | 是 | 多行输入 | 去掉首尾空格后 1–500 字符；提示 “Be specific: what will exist or be answered when you're done? You can edit this later.” | Describe your team's goal. |
| 队友 `teammate_ids` | 否 | 输入姓名或 OSU 邮箱后点 `Add`（或按 Enter），以标签形式显示，可以用 × 移除；当前用户固定显示为 “<姓名> (you)” | 队友成为**共同所有者**，权限与创建者相同；创建后也可以在 `Edit project` 中增减 | — |

自动记录：`source_project_id`、`created_by`、`created_at`、`request_id`（见 4.5）。

### 4.4 状态

| 状态 | 显示 |
|---|---|
| 默认 | 字段为空，`Create project` 可点 |
| 校验失败 | 点 `Create project` 时校验所有字段，错误字段标红并显示上表文案，焦点移到第一个错误字段。不发送请求 |
| 提交中 | 按钮变为转圈图标加 `Creating project…`，处于禁用状态；所有字段只读；`Cancel` 不可用 |
| 失败 | 表单顶部红色提示：**We couldn't create your project.** Check your connection and try again. Everything you entered is still here. 所有输入保留，按钮恢复为 `Create project` |
| 成功 | 直接跳转到新项目页 `/projects/<new_id>`，第一次打开时显示 §4.8 的并排视图，提示 `Project created. You picked up <来源名称> (<方式>).` |

### 4.5 防止重复创建
- 前端：提交中禁用按钮，忽略重复提交。
- 每次打开表单生成一个 `request_id`，重试时沿用同一个。
- 后端：同一个 `request_id` 只创建一个项目；重复请求返回已经创建的项目，前端照常跳转。

### 4.6 取消
- 点 `Cancel` 或返回链接，回到来源项目。
- 有输入时先确认：`Discard what you entered?`（确定 / 取消）

### 4.7 对来源项目的影响
- 只在来源项目的 “Picked up by” 里增加一条记录，其他内容完全不变。

### 4.8 接棒后的新项目页（`picked-up.html`）
新项目状态为 Ongoing，页面分左右两栏（手机上上下排列）：

**顶部（项目头部）**
- 标题、所有者（创建者和队友）、`Picked up from <来源> <来源状态> by <来源团队> · <方式>`、`Built on work by <来源团队>`。
- Mentor 一行：
  - 来源有 Mentor：`Mentor <名字> continues from <来源>. Questions that ask for a mentor go to them directly.`
  - 来源没有 Mentor：`None yet. When you ask for a mentor, Staff will refer one.`
- 第一次打开时有一条可关闭的提示：`You picked up <来源> to continue it. On the left is their project as it is now. Bring in whatever helps; anything you bring in stays editable.`（Reproduce 和 Improve 的措辞不同，见草图）

**左栏：来源项目的内容（紫色框，只读）**
- 完整重现来源项目当前的内容，按接棒方式调整顺序：

  | 方式 | 顺序 |
  |---|---|
  | Continue | 他们停在哪里 / 现在进行到哪里 → 建议或目标 → 他们做了什么 → 遇到的问题 → 可复用材料 → 描述 |
  | Reproduce | 他们做了什么 → 遇到的问题 → 可复用材料 → 描述 → 他们停在哪里 |
  | Improve | **选择要改进的部分**（单选）→ 遇到的问题 → 建议 → 可复用材料 → 描述 |

- 带入按钮：
  - 描述：`Use as my description`
  - 建议或目标中的每一条：`Use as my goal`（会替换当前目标，第一次替换前确认 `Replace your current goal with this one?`）
  - Improve 方式下选中某个部分后：`Use "Improve: <部分>" as my goal`
  - 成果和材料中的每一条：`Add to my links`（加入后按钮变为 `Added ✓`）
- 底部说明：`This is their project as it is now. Bringing something in makes a copy in your project; later changes on either side don't affect the other.`

**右栏：自己的项目**
- Description（默认为空）、Goal（来自接棒表单）、Links、Progress、Questions。
- 带入的内容可以直接点击编辑，并带标签：未修改时为 `From <来源>`，编辑后变为 `Adapted from <来源>`。链接可以用 × 移除。
- 不带入的内容只留在左栏作参考，不会出现在自己的项目里。
- Questions 为空时提示：Mentor 是谁（或由 Staff 引荐），以及 `Ask the original team`（跳到来源项目的问题区）。

**之后再打开**：显示 §2 的普通 Ongoing 项目页（`mia-ongoing.html`），来源行和带入内容的标签保留。是否保留“查看来源内容”的入口，见 §9.2。

---

## 5. 交付 B：问题—引荐—回复（`mia-ongoing.html`）

### 5.1 问题状态（由数据推导，不需要手动设置）

| 状态 | 条件 | 状态标签 |
|---|---|---|
| `needs_referral` | 还没有引荐记录 | `Waiting for Staff referral`（等待超过 1 天时加 `· N days`） |
| `referred` | 有引荐，被引荐 Mentor 还没回复 | `Referred to <Mentor> · waiting for reply` |
| `replied` | 被引荐 Mentor 至少回复过一次 | `<Mentor> replied` |
| `discussion` | 提问时选了“不需要 Mentor” | `Open discussion · no mentor requested` |

**Mentor 跟着项目走**：项目是从有 Mentor 的项目接棒而来时，提问表单的选项变为三个：
- `Yes, ask <Mentor> (mentor from <来源>)`
- `Yes, but ask Staff to find a different mentor`
- `No, just open discussion`

选第一项时，系统自动生成一条引荐记录（`kind = inherited`，没有 Staff），问题直接进入 `referred`，标签为 `Sent to <Mentor> · waiting for reply`。问题下的系统行写 `<Mentor> continues from <来源>`，说明 `Assigned automatically because they mentored the project you picked up. No Staff referral needed.`。之后的回复、追问和工作台逻辑与 Staff 引荐的问题相同。

没有“已解决”或“已关闭”状态，本版不加。

### 5.2 连续画面（同一个问题）

| 步 | 画面 | 操作者 | 提交内容 | 成功后 |
|---|---|---|---|---|
| 0 | 新项目，Questions 为空：`No questions yet.` 和 `Stuck on something specific? Ask here. Staff can refer a mentor to it.` | — | — | — |
| 1 | Mia 点 `Ask a question`，在新问题表单里填问题（必填，≤120 字符）和补充说明（选填，≤2000 字符），选择 **Do you want a mentor to answer?**（必选：`Yes, ask Staff to refer a mentor` / `No, just open discussion`），点 `Post question` | Student | `title`, `body`, `wants_mentor` | 选 Yes：问题标签为 `Waiting for Staff referral`，同时进入 Staff 工作台的 “Needs referral”。选 No：标签为 `Open discussion`，**不进入** Staff 工作台，没有第 2–5 步 |
| 2 | 一天后仍然等待，标签变为 `· 1 day`。Kevin 在工作台点击任务，打开项目页并定位到该问题 | Staff | — | — |
| 3 | Kevin 点 `Refer a mentor`，问题下方展开引荐表单：选择 Mentor（必选，单选列表加搜索框），填写理由（必填，≤300 字符，提示 “Shown to everyone under the question, and to the mentor.”），点 `Send referral` | Staff | `mentor_id`, `reason` | 进入第 4 步，提示 `Referral sent. Sarah will see this question in her workbench.` |
| 4 | 问题下出现引荐记录（蓝底系统行）：`Kevin [Staff] referred Sarah Chen [Mentor] · Oct 28`，下一行是引荐理由。状态标签为 `Referred to Sarah Chen · waiting for reply`。其他学生可以普通评论（示例：Jordan） | — | — | 问题进入 Sarah 的 “To reply” |
| 5 | Sarah 在输入框 `Reply as the referred mentor` 中回复，点 `Post reply` | 被引荐 Mentor | `body` | 回复带绿色底和 `Referred mentor reply` 徽章；状态变为 `Sarah Chen replied` |
| 6 | Mia 在 `Add a follow-up` 中追问或补充进展，点 `Post follow-up`；她也可以在 Progress 区点 `Add update` | Student 所有者 | `body` | 追问带 `Follow-up` 标签，排在回复列表末尾；问题**回到 Sarah 工作台的 “To reply”**，标记 `New follow-up` |

回复列表按时间顺序平铺，最早的在上面。第一条是问题正文。

### 5.3 各角色在问题下看到的操作

| 角色 | 等待引荐 | 已引荐，等待回复 | 已回复 |
|---|---|---|---|
| Student 所有者 | `Add a follow-up` 输入框 | 同左 | 同左 |
| 其他 Student | `Add a comment` 输入框 | 同左 | 同左 |
| Staff | `Refer a mentor` 按钮，旁边写 “No mentor referred yet”；下方有 `Add a comment` 输入框 | 禁用的 `Referred` 按钮，旁边写 “<谁> referred <Mentor> on <日期>. Each question can be referred once.”；下方有 `Add a comment` | 同左 |
| Staff（问题选了不需要 Mentor） | 只有 `Add a comment`，旁边写 “The asker didn't request a mentor, so this question isn't in your workbench.” | — | — |
| 被引荐的 Mentor | （还没被引荐，与其他 Mentor 相同） | `Reply as the referred mentor` 输入框，提示 “Kevin referred you to this question. Your reply will be marked "Referred mentor reply".” | 同左（之后的每条都算正式回复） |
| 其他 Mentor | `Add a comment` 输入框，提示 “This will show as a regular comment. You haven't been referred to this question.” | 同左 | 同左 |

### 5.4 正式回复和普通评论的区分

| 类型 | 判定 | 显示 |
|---|---|---|
| 正式回复 | 作者 = 该问题引荐记录中的 Mentor | 绿色底和绿色描边，带 `Referred mentor reply` 徽章 |
| 追问 | 作者 = 项目所有者 | 白底，带 `Owner` 和 `Follow-up` 标签 |
| 普通评论 | 其他所有人 | 白底，带角色标签和 `Comment` 标签 |
| 引荐记录 | 系统生成 | 蓝底，不是回复，没有输入框 |

### 5.5 避免重复引荐
- 每个问题**最多一条引荐**（数据库唯一约束）。已引荐的问题不再显示 `Refer a mentor`，而是显示引荐状态。工作台中它移到 “Referred” 标签页。
- 两个 Staff 同时打开表单时，后提交的一方收到冲突提示：
  > **Already referred.** Another Staff member referred this question a moment ago. Nothing was sent.

  旁边有 `Refresh question` 按钮，`Send referral` 变为禁用。
- 提交中按钮显示 `Sending…` 并禁用。
- 本版不做撤回、转派或多位 Mentor 会诊。

### 5.6 空状态和失败

| 情况 | 显示 |
|---|---|
| 项目没有问题 | 虚线框：`No questions yet.`、`Stuck on something specific? Ask here. Staff can refer a mentor to it.` |
| Mentor 名录为空（Staff 打开引荐表单时） | 列表位置显示 `No mentors in the directory yet.`、`The question stays in your workbench under "Needs referral". You can refer it once mentors join.` `Send referral` 禁用 |
| Staff 工作台没有待引荐问题 | `Nothing needs a referral right now.` |
| Mentor 工作台没有待回复问题 | `No questions waiting for you.`、`When Staff refer you to a question, it shows up here with their reason.` |
| 发布问题失败 | `Couldn't post your question. Your text is kept. Try again.` |
| 回复、评论、追问失败 | `Couldn't post. Your text is kept. Try again.` |
| 引荐失败 | `Couldn't send the referral. Your choices are kept. Try again.` |
| 提交空内容 | 不发送请求，显示 `Write something before posting.`、`Write your question.`、`Choose a mentor.` 或 `Write why this mentor fits.` |
| 项目没有 Mentor 参与 | 完全正常。项目可以发布、完成、暂停、被接棒，问题可以一直停在等待引荐状态 |

### 5.7 项目变为 Finished 或 Paused 后
- 问题、引荐记录、全部回复原样保留，状态标签照常推导。
- 所有人的操作和 Ongoing 时相同，仍然可以提问、引荐和回复。
- 项目内容区按 §2.2 显示新状态的字段，Questions 区块完全不变。
- 在演示控制条把 “Project status” 切到 Paused 或 Finished，或者以所有者身份点 `Change status`，即可查看。

### 5.8 编辑和删除自己的帖子
- 每条帖子作者本人可以看到 `Edit` 和 `Delete`。适用于问题正文、追问、评论、正式回复。
- **编辑**：原地变成输入框，按钮为 `Cancel` 和 `Save`，内容不能为空。保存后时间旁边显示 `· edited`。
- **删除**：先确认 `Delete this post? Others will see that it was deleted.`，然后原位置显示 `This post was deleted by its author.`，这样回复列表的上下文不会乱。
- **问题本身**：只有在没有引荐、也没有别人回复时才能删除（`Delete this question?`），删除后整个问题消失。之后只能编辑。
- 引荐记录不是帖子，不能编辑或删除。
- 被引荐 Mentor 删除了自己唯一的回复后，问题状态回到 `Referred · waiting for reply`。

---

## 6. 工作台（`workbench.html`）

| 工作台 | 标签页 | 条目内容 | 点击后 |
|---|---|---|---|
| Staff | `Needs referral (n)`：选了需要 Mentor、且还没有引荐的问题（不论提问者是不是项目所有者），等待最久的排在前面。开放讨论的问题不出现 | 问题标题、项目名称·所有者·状态、提问日期、状态标签（含等待天数） | `/projects/<id>#q-<question_id>`，打开项目页并定位到该问题 |
| Staff | `Referred (n)`：已引荐的问题 | 同上，另加 “<谁> referred <Mentor> · 日期”、`Waiting for <Mentor>` 或 `<Mentor> replied` | 同上 |
| Mentor | `To reply (n)`：引荐给我（含自动延续）、且最新一条帖子不是我发的问题（包括我回复后所有者又追问的，标 `New follow-up`） | 问题标题、项目、“Referred by <Staff> · 日期”和理由摘要；自动延续的写 “Continued from <来源>” | 同上；输入框为正式回复 |
| Mentor | `Replied (n)`：引荐给我、且最新一条帖子是我发的问题 | 问题标题、项目、“You replied <日期>” | 同上 |

顶部导航中，只有 Staff 和 Mentor 能看到 `Workbench` 入口。

---

## 7. 最小数据结构

```
Project
  id, title, summary, owner_ids[], term, status (ongoing|finished|paused)
  links[]              {label, url}
  goal                 Ongoing
  progress_updates[]   {date, author_id, text}
  outcomes, problems_solutions, next_team_advice           Finished
  pause_reason, if_again, reusable[] {label, url}          Paused
  status_history[]     {status, at, by}        改变状态时，新状态字段覆盖旧字段，历史只记录状态和时间
  source_project_id    可空；接棒时设置（来源可以是任意状态）
  baton_type           Reproduce|Continue|Improve；可空
  mentor_id            可空；接棒时从来源项目继承（来源有多位 Mentor 时见 §9.2）
  summary_from_source, goal_from_source   bool；带入时为 true，用于显示 From / Adapted from 标签
  summary_edited, goal_edited             bool
  links[].from_source_project_id          可空
  created_at

Question
  id, project_id, author_id, title, body (可空), route (mentor|staff|none), created_at, edited_at, deleted_at
                       route=mentor 只在项目有继承的 mentor_id 时可选
  status               由数据推导：route=none → discussion；没有 Referral → needs_referral；
                       有 Referral 但 mentor 没有未删除的帖子 → referred；否则 → replied

Referral               每个问题最多一条（question_id 唯一）
  id, question_id, kind (staff|inherited), staff_id (inherited 时为空), mentor_id, reason (inherited 时为空), created_at

Post                   平铺
  id, question_id, author_id, body, created_at, edited_at, deleted_at
  kind                 由数据推导：author = referral.mentor_id → mentor_reply；author ∈ project.owner_ids → follow_up；否则 → comment

MentorProfile
  user_id, title, organization, expertise_tags[]
```

接棒请求：
```
POST /projects
  {source_project_id, baton_type, title, goal, teammate_ids[], request_id}
→ 201 {id}            成功或重复请求时都返回已创建的项目 id
→ 4xx {field_errors}  校验失败
```

引荐请求：
```
POST /questions/:id/referral
  {mentor_id, reason}
→ 201
→ 409 {referral}      已被引荐，返回现有记录，前端显示冲突提示
```

---

## 8. 演示文案（全部虚构）

**来源项目：** Study Spot Finder（Paused · Spring 2026 · Alex R. 和 Jordan T.）
- **简介：** A web page that shows which group study rooms in campus libraries are free right now.
- **暂停原因：** We pulled room data by scraping the library's booking page. Its layout changed twice during the semester, our scraper broke each time, and we ran out of time to keep fixing it.
- **如果重来：**
  - Ask the library whether an official data export exists before writing a scraper.
  - Start with one building instead of every library.
  - Show when the data was last updated.
- **可复用材料：**
  - Room list and floor map component（GitHub）
  - Building and room spreadsheet
  - Notes from student interviews
- **Where to start：** reuse the map component and ignore the `/scraper` folder.

**接棒（Mia Z.，10 月 26 日，Continue）**
- **名称：** Study Spot Finder: One-Building Pilot
- **目标：** Show which group study rooms in one library building are free in the next two hours, using an official daily export from the library instead of scraping.

**问题（Mia，10 月 27 日）**
- **标题：** How do we show room availability students can trust when the data is up to a day old?
- **补充说明：** The library can send us a daily export of room bookings (a CSV each morning), but not live updates. Walk-in use isn't recorded at all. How should we show availability so students don't walk to a room that is actually taken?

**引荐（Staff Kevin → Mentor Sarah Chen，Data Engineer · Brightline Health，10 月 28 日）**
- **理由：** Sarah has built dashboards from daily data exports and can advise on showing data that isn't live.

**普通评论（Jordan T.，原团队学生，10 月 28 日）**
> When we still had the scraper, most students checked rooms 10–15 minutes before going. That might help you decide how fresh the label needs to be.

**正式回复（Sarah，10 月 29 日）**
> Don't present it as live. Label every room with the data time, for example "Booked as of 7:00 AM", and keep walk-in rooms in a separate "not tracked" list. Refresh as soon as the export arrives. Before building more, show the labels to five students and ask what they think "as of 7:00 AM" means.

**追问（Mia，10 月 30 日）**
> Update: we added the "as of" label and a separate list for walk-in rooms to the prototype. This week we'll show it to five students as you suggested. One more question: if a booked room is still empty 15 minutes after its start time, should we show it as "possibly free"?

**进展更新（Mia，10 月 30 日）**
> Added an "as of" time label and a separate walk-in list to the prototype. Next: show it to five students.

**原项目更新：** Study Spot Finder 的 “Picked up by (1)” 中出现：Study Spot Finder: One-Building Pilot · Mia Z. · Continue · Ongoing · started Oct 26, 2026。

演示文案只描述做了什么和打算做什么，不声称任何测试结果。

---

## 9. 规则确认记录

### 9.1 已确认（2026-10-24）

| # | 问题 | 结论 |
|---|---|---|
| 1 | 所有者能否接棒自己的项目？ | 可以 |
| 2 | 接棒时能否加队友？ | 可以，队友是共同所有者 |
| 3 | 问题要不要“已解决”状态？ | 暂时不加 |
| 4 | 非所有者提的问题是否进入 Staff 列表？ | 进入（前提是提问时选了需要 Mentor） |
| 5 | Staff 能否普通评论？ | 可以 |
| 6 | 所有者追问后是否回到 Mentor 的 “To reply”？ | 回到，标 `New follow-up` |
| 7 | Staff 能否跳过？ | 提问者首次提问时选择是否需要 Mentor：需要则经过 Staff，不需要则 Staff 不必处理 |
| 8 | 帖子能否编辑或删除？ | 可以，规则见 §5.8 |
| 9 | 状态变化后旧字段怎么处理？ | 新状态字段直接覆盖旧字段 |
| 10 | Paused/Finished 能否改回 Ongoing？ | 可以 |
| 11 | 文本长度上限 | 先不调整，沿用本说明中的数值 |
| 12 | Feed 首页范围 | 本次不处理 |

### 9.2 已确认（第二轮）

| # | 问题 | 结论 |
|---|---|---|
| 13 | 接棒后能否带入原项目内容？ | 可以选择性带入，带入后可编辑（§4.8） |
| 14 | Mentor 能否发布项目？ | 不能，Mentor 只回复和评论 |
| 15 | 接棒的学生遇到问题找谁？ | 继续由来源项目的 Mentor 指导，也可以选择让 Staff 另找 |
| 16 | Ongoing 项目能否接棒？ | 可以 |
| 17 | 接棒页上的“我的计划”清单 | 不需要，已去掉 |
| 18 | 从首页接棒 | Feed 卡片点 `Pick up` → 接棒表单 → 提交后直接进入新项目页 |

### 9.3 仍待确认

| # | 问题 | 草图暂定做法 |
|---|---|---|
| 1 | 选了“不需要 Mentor”的问题，之后能否改成需要？Staff 能否主动引荐它？ | 都不能 |
| 2 | 覆盖旧字段时，旧数据在数据库里是删除，还是保留但不显示？ | 建议数据库保留，以便日后恢复 |
| 3 | 来源项目有多位 Mentor（多个问题由不同 Mentor 回复）时，继承哪一位？ | 继承最近一次回复的那位 |
| 4 | 第一次之后再打开新项目，是否保留“查看来源内容”的左栏入口？ | 不保留，只有来源行链接 |
| 5 | 继承的 Mentor 能否拒绝或不再继续？ | 本版不做 |
| 6 | 从首页点 `Pick up` 是否要跳过表单、直接创建？ | 保留表单（需要名称和目标），提交后直接进入新项目页 |
