# P2 真实 AI 证据（E1，脱敏）

本文件是 2026-10-24 已完成的真实调用结果，返修时**没有新增任何真实调用**。所有字段都摘自当时验证脚本的终端输出；没有 key、Authorization、请求原文或个人资料，项目内容为虚构演示数据。

- Provider：OpenAI Responses API，官方地址 `https://api.openai.com/v1/responses`，未设 `OPENAI_BASE_URL`。
- 模型：`gpt-6-luna`（来自用户的 `.env.local`，该文件已被 git 忽略，未提交）。
- 环境：独立生产服务器 `next start`，端口 `127.0.0.1:3300`，使用临时 PGlite；没有使用 3000 服务或用户数据库。
- 身份/项目：Alex（`student-alex`）/ `project-v2-paused`（Campus Notification Prototype，Paused）。

## 调用记录（上限 3 次，实际 2 次）

| 次序 | 结果 |
|---|---|
| 1 | OpenAI 返回 HTTP 404，接口返回 503 `AI_UNAVAILABLE`，没有写入。原因：模型名配置为 `gpt-6-Luna`，与账号中的 ID `gpt-6-luna` 大小写不同。之后通过免费的 `/v1/models` 列表（不生成内容）核对 ID，只修正了模型行。 |
| 2 | **成功**。生成 200，耗时 2.5s；确认 200。 |

## 第 2 次生成的原样输出

句子（2 句，每项经 `Intl.Segmenter` 判定恰好一句）：

1. A Student Innovation Club notification project with a local signup screen; notification delivery and consent requirements remain unfinished.
2. The project is paused after the team ran out of time to choose a delivery service and review consent requirements.

标签（3 个）：`notifications`, `web`, `consent`

内容核对：两句只复述已保存的 progress（本地报名页面完成，通知发送未完成）和 whyPaused（没来得及选择发送服务和审查同意要求），没有编造成果、数字或人物。

## 生成 → 确认 → 浏览 核对（脚本输出）

| 检查 | 结果 |
|---|---|
| generate 状态 | 200 |
| 确认前公共卡片 `introduction` | null（草稿未公开） |
| confirm 状态（草稿原样确认） | 200 |
| 确认后 `/api/projects` 中的 introduction | 存在，`stale=false`，句子与草稿一致 |
| 作者 summary 未改变 | true |
| reflection 未改变 | true |
| 公开列表含 draftId | false |
| 公开列表含模型名 | false |

截图：[p2-real-ai-browse-card.png](p2-real-ai-browse-card.png)，即确认后以 Mia 身份浏览的首页：Campus Notification Prototype 卡片显示上述两句、`AI-assisted · owner-reviewed` 标记和三个标签，其他卡片仍是作者内容。
