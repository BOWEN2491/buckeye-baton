# 队友协作练习

目标：你负责后端、核心算法/API 与集成；队友先负责小范围界面任务、测试和展示。通过一次真实交付再决定分工。

## 当前练习接口

浏览器调用 `POST /api/echo`（Vite 开发代理转发到本机 8000 端口）。

请求：

```json
{"text":"Hello"}
```

HTTP 200 响应：

```json
{"result":"Hello","characters":5,"mode":"practice"}
```

只包含空白、空字符串或超过 2000 字符会返回 HTTP 422。服务不运行时，界面应显示错误。这里不连接 AI，不把回显结果伪装成智能分析。

## 发给队友的小任务（约 60–90 分钟）

1. 克隆仓库，按照 README 安装并启动。
2. 在独立分支中修改标题、按钮文案和结果展示；保持请求/响应字段一致。
3. 验证普通文字、中文、空输入；停止后端一次，观察错误提示，再恢复后端。
4. 在手机宽度检查布局；运行 `npm.cmd --prefix frontend run build`。
5. 提交 PR，附一张结果截图和测试说明。
6. 用不超过一分钟讲清楚“用户输入 → fetch → FastAPI → JSON → React 状态变化”。

可复制给编程助手的提示：

> 这是赛前学习项目。请先读 README.md 和 TEAMMATE.md。只修改 frontend 中的页面文案、结果卡片和错误提示，不改后端接口，不添加 API Key、登录或数据库。保留加载和失败状态。先解释请求经过哪些文件，再帮我运行和测试。最后总结改了什么和怎样验证。

## GitHub 连接与首次安装

实际仓库为 https://github.com/BOWEN2491/Hacking1024 。拥有者的现有目录为 `D:\HackOHIO_1024`，`origin` 应指向：

```text
https://github.com/BOWEN2491/Hacking1024.git
```

拥有者先在 [Settings → Collaborators](https://github.com/BOWEN2491/Hacking1024/settings/access) 中邀请队友并让他接受邀请。仓库当前公开，可以直接克隆；推送分支需要写入权限。

队友在 PowerShell 中执行（Windows，Python 3.11 + Node.js 22.19.0 + Git）：

```powershell
git clone https://github.com/BOWEN2491/Hacking1024.git
cd Hacking1024
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
npm.cmd --prefix frontend ci
.\start.ps1
```

在浏览器打开 http://127.0.0.1:5173 并测试文字回显。这个练习不需要 API Key。按 `Ctrl+C` 停止，接着开工作分支：

```powershell
git switch -c teammate/ui-practice
```

第一次使用 Git 的队友还需要在自己的仓库内设置提交身份：`git config user.name "自己的名字"`，以及 `git config user.email "自己的GitHub邮箱或noreply邮箱"`。这里填写的是队友自己的身份，不要使用仓库拥有者的身份。

改完后：

```powershell
git add frontend
git commit -m "Improve practice UI wording"
git push -u origin teammate/ui-practice
```

在 [Pull requests](https://github.com/BOWEN2491/Hacking1024/pulls) 开 PR，base 选 `main`，compare 选自己的分支，由你检查后合并。不要两个人同时改同一个文件；练习阶段队友只动 frontend，你负责 backend。接口要改时先通知对方，更新本文件再做代码。

每次开始新的工作，在没有未提交改动的前提下：

```powershell
git switch main
git pull --ff-only
git switch -c teammate/next-task
```

`teammate/next-task` 要换成这次任务的新分支名。你可以对应使用 `backend/任务名`。如果切换分支或拉取被本地改动阻止，先提交当前工作，不要用 `reset --hard` 丢弃文件。

## 开赛后先填写的接口约定

- Endpoint / method：
- Request JSON 和一组演示输入：
- Success JSON 和字段含义：
- Failure 状态码和前端提示：
- 超时和加载状态：
- 你预计什么时候交付可运行接口：

## 3 分钟视频草稿

- 0:00–0:25：谁遇到什么问题。
- 0:25–1:45：展示一条完整的真实操作流程。
- 1:45–2:20：技术亮点、数据/API 来源与验证方法。
- 2:20–2:45：实际价值与局限。
- 2:45–3:00：明确本次比赛贡献和后续方向。

这是建议分配。最终按现场要求录制，提前检查链接能否被未登录的评委打开。
