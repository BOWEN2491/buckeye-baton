# Hacking1024 — HackOHI/O 2026 赛前准备

仓库：https://github.com/BOWEN2491/Hacking1024

这是 **2026-10-22 创建的通用环境练习**。正式比赛项目和题目尚未确定。如果复用这里的代码，请按 `PRIOR_WORK.md` 披露赛前工作。

## 现在怎么用

在 PowerShell 中执行：

```powershell
cd D:\HackOHIO_1024
.\start.ps1
```

终端显示地址后，用浏览器访问 **http://127.0.0.1:5173**，输入文字并点击“发送到后端”。看到“联调成功”就证明浏览器 → React → FastAPI → JSON → 页面展示已经跑通。这一步不调用 OpenAI，也不需要 Key。

FastAPI 接口文档：**http://127.0.0.1:8000/docs**。按 `Ctrl+C` 停止。启动脚本会关闭它自己启动的后端。

如果 PowerShell 提示禁止运行脚本，可仅为这次进程运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

## 常用命令

```powershell
.\start.ps1 -Mode check       # 检查环境，只显示 Key 是否存在
.\start.ps1 -Mode api         # 可选：一次真实 OpenAI 请求，会有少量 API 用量
.\start.ps1 -Mode fallback    # Streamlit 备用界面，http://127.0.0.1:8501
.\start.ps1 -Mode backend     # 单独运行后端
.\start.ps1 -Mode frontend    # 另一窗口单独运行前端
npm.cmd --prefix frontend run build
```

API 在你此前的 PowerShell 中已经测试成功。若要用这里的 `-Mode api` 重新测试，必须让这个终端也能读到 Key。你可以在**已设置 Key 的原 PowerShell 窗口**切换到本目录后运行它；或者自行把 `.env.example` 复制为 `.env` 并仅在本机填写真实 Key。`.env` 已被 Git 忽略，不要把 Key 发给队友或放入 React。脚本只向官方 `https://api.openai.com/v1` 发送此测试。

## 为什么代码放 D 盘

- 检查时 C 盘剩余约 37 GB，D 盘约 343 GB，代码与 `node_modules`、`.venv` 放 D 盘更宽裕。
- Miniconda 在 C 盘不要求代码也在 C 盘。解释器和源码可以分别放置。
- 本项目 `.venv` 基于已经可用的 Python 3.11.9 创建。启动脚本直接指定 `.venv\Scripts\python.exe`，不依赖当前激活的 Conda 环境。
- Miniconda 的 base、系统 PATH、全局 Python 包均未修改。VS Code/Cursor 打开本目录时，应确认 Python 解释器为 `D:\HackOHIO_1024\.venv\Scripts\python.exe`。
- 以后真需要 Conda 原生依赖时再创建独立 Conda 环境，不要把比赛依赖装入 base，也不要在同一终端叠加激活 Conda 和 `.venv`。
- `.venv` 和 `node_modules` 应在每台电脑重新安装，不能靠复制目录迁移。

## 队友或重装时

Windows 首次安装需有 Python 3.11、Node.js（本机验证为 22.19.0）和 Git。先确认 `python --version`、`node --version`、`npm.cmd --version`、`git --version` 有输出。选择一个尚不存在的本地目录克隆，目录不必与队友相同：

```powershell
git clone https://github.com/BOWEN2491/Hacking1024.git
cd Hacking1024
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
npm.cmd --prefix frontend ci
.\start.ps1 -Mode check
.\start.ps1
```

`requirements-lock.txt` 记录本机 Windows 上实测的完整版本；不同操作系统若有兼容问题，可用 `requirements.txt` 重新解析后验证。`frontend/package-lock.json` 由 npm 管理，不要手动改。

拥有者的现有目录 `D:\HackOHIO_1024` 已经安装完毕并连接此仓库，不需要再次克隆或重新建立 `.venv`。更新代码可执行 `git pull --ff-only`；若有本地改动，先提交到自己的工作分支再拉取。

macOS/Linux 可用 `python3 -m venv .venv`，然后用 `.venv/bin/python -m pip install -r requirements.txt` 和 `npm --prefix frontend ci` 安装。在两个终端分别运行 `.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` 与 `npm --prefix frontend run dev`。`start.ps1` 是 Windows 启动脚本。

## 日常协作

- `main` 保留可运行的集成版本；每个人在独立分支开发，通过 Pull Request 合并。
- 你主要改 `backend/`，队友优先改 `frontend/`；接口格式约定见 `TEAMMATE.md`。
- 队友需要接受仓库的 Collaborator 邀请后才能推送分支。仓库公开只代表能读取，不代表有写入权限。
- 依赖目录和密钥不随 Git 同步；每台机器独立安装依赖。日常 `git pull` 后仅在依赖清单变化时重新安装。
- 如果想把此仓库作为 Codex/Cursor 的后续工作目录，应直接打开实际克隆目录；你当前电脑打开 `D:\HackOHIO_1024`。

## 文件导航

| 文件 | 用途 |
|---|---|
| `CHECKLIST.md` | 已完成项和必须手动完成的清单 |
| `TEAMMATE.md` | 队友练习、真实接口格式和 Git 协作步骤 |
| `PRIOR_WORK.md` | 赛前工作披露模板 |
| `backend/main.py` | 健康检查、文字回显接口；没有比赛业务逻辑 |
| `frontend/src/main.jsx` | 一个表单及加载、失败、成功状态 |
| `fallback/app.py` | Streamlit 备用练习 |
| `scripts/check_api.py` | 独立 API 检查，不打印密钥或原始错误 |
| `start.ps1` | 明确使用本项目解释器启动服务 |

## 部署时要注意

当前练习只监听本机。Vite 的 `/api` 代理只在开发服务器中工作，`npm run build` 不会把 Python 后端打包进去。后续要公开部署 React + FastAPI，需要分别运行后端并配置反向代理或明确的 API 地址和 CORS。先确定题目，再按需要部署；录屏本地演示的准备也应完成。

官方入口：[赛事首页](https://hackohio2026.devpost.com/)、[规则](https://hackohio2026.devpost.com/rules)、[Resources 与 Guidebook/Discord](https://hackohio2026.devpost.com/resources)、[公开时间表](https://hackohio2026.devpost.com/details/dates)。
