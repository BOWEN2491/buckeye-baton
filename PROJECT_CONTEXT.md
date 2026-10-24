# Hacking1024 — 新对话背景

最后更新：**2026-10-23，America/New_York**。本文件是简短摘要；完整状态和文件地图见 `project-docs/index.html`，修改规则见 `project-docs/MAINTENANCE.md`。

## 项目是什么

- 仓库：[BOWEN2491/Hacking1024](https://github.com/BOWEN2491/Hacking1024)，当前公开。
- 拥有者的本地目录：`D:\HackOHIO_1024`。旧聊天目录 `C:\Users\23678\Documents\ChatGPT\O` 不是项目目录。
- 背景：准备参加 HackOHI/O 2026，赛事日期为 10 月 24–25 日。今天仍属于赛前准备。
- 两人团队：用户承担架构、后端、AI/算法及集成；队友技术基础较弱，准备借助 coding agent 承担基础前端、测试和演示。队友安装和首次 PR 尚未确认。
- **正式选题、Sponsor Challenge、数据集和产品功能尚未确定。当前仓库只有通用环境练习，不能把 echo 回显当作已完成的 AI 产品。**

## 已经完成且有证据

- D 盘独立 `.venv`，基于 Python 3.11.9；Node.js 22.19.0、npm 11.6.0、Git 2.47.1。
- 机器上另有 C 盘 Miniconda，但本项目不使用 Conda base，不需要把代码搬回 C 盘。
- React 19.3.1 + Vite 8.3.5；FastAPI、Uvicorn、OpenAI SDK、Streamlit 等已安装。完整版本见锁文件。
- 2026-10-22：前端生产构建、`pip check`、真实中文 POST、空输入、HTTP 422、模拟 503 提示与恢复、桌面/390px 手机布局通过；Streamlit 基本交互与健康检查通过。
- 用户此前在自己的 PowerShell 中调用 `gpt-6-luna` 返回 `OK`。这是历史连通性证据，不代表当前 agent 进程能读到 Key，也不代表余额已核对。
- 2026-10-23：`origin` 已连接仓库并成功推送，`main` 跟踪 `origin/main`，Git 本机读写权限已验证。
- Git 忽略 `.env`、虚拟环境、依赖和构建产物；已有赛前工作披露模板 `PRIOR_WORK.md`。
- 2026-10-23：已建立完整项目文档和新对话入口，验证六个页面标签、26 项文件地图、真实截图及本地待办保存。
- Vercel 连接曾验证可读，但没有为此项目完成云端部署。

## 当前运行方式

Windows PowerShell，在项目根目录：

```powershell
.\start.ps1                  # React + FastAPI
.\start.ps1 -Mode check      # 环境与 Key 是否存在；不输出 Key
.\start.ps1 -Mode fallback   # Streamlit 备用界面
```

- 页面：`http://127.0.0.1:5173`
- 后端文档：`http://127.0.0.1:8000/docs`
- 健康检查：`GET /api/health`
- 练习接口：`POST /api/echo`，请求 `{"text":"Hello"}`，响应 `{"result":"Hello","characters":5,"mode":"practice"}`。
- `Ctrl+C` 停止。服务是否正在运行应现场检查，不从文档推断。
- 默认练习不调用 AI。`-Mode api` 才是可选真实请求；不要为了读懂背景自动发起 API 调用。
- 前端 `/api` 使用 Vite 开发代理。静态 build 不会自动部署 Python 后端。

## 尚未确认 / 下一步

1. 用户是否已核对 OpenAI 组织/项目余额与预算，是否在当前终端或本机 `.env` 配置 Key。
2. 两人的报名、Discord 权限、最新 Sponsor 题目与提交入口。
3. 队友是否接受 Collaborator 邀请、成功克隆安装并完成首个 PR。
4. 录屏、声音、视频链接权限与 Zoom；是否需要公网部署。
5. 看到正式题目后再确定一个小而完整的 MVP；不提前引入登录、数据库、训练环境或复杂 Agent 架构。

赛事信息曾于 2026-10-22 核对：官方页面要求通过 Discord 发布的 Google Form 提交，视频最长 3 分钟；公开时间表列出 10 月 25 日 10:00 EDT 截止。最终需以最新官方公告为准。入口见 `CHECKLIST.md`。复用赛前代码须披露，不能把历史准备计为比赛期间成果。

## 文档导航与维护

- `AGENTS.md`：新 agent 入口与工作约定。
- `project-docs/index.html`：完整项目页；含机器可读 meta、文件地图、待办、决策摘要与更新记录。
- `README.md`：安装、启动、跨平台与部署边界。
- `TEAMMATE.md`：队友首次安装、练习接口、分支/PR 与展示草稿。
- `CHECKLIST.md`：手动账号和活动事项；`DECISIONS.md`：技术选择原因。
- `task_plan.md`、`progress.md`、`findings.md`：历史执行记录；历史“待办”可能已完成，以最新项目页与 Git 状态核对。

新对话建议先核对 Git 状态，再用几句话说明当前阶段、已知限制和你准备处理的本次任务，不需要重做已经验证过的全部环境安装。
