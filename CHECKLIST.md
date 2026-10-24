# 赛前 Checklist

更新时间：2026-10-23（America/New_York）。勾选只代表已经验证，不代表账号设置已代办。

## 自动准备和验证

- [x] 用户本人已成功调用 `gpt-6-luna`，返回 `OK`。
- [x] Python、Node.js、npm、Git 可用。
- [x] D 盘项目目录、隔离环境配置、Git 忽略文件和启动脚本已创建。
- [x] GitHub 连接器身份已读取：`BOWEN2491`；Git 本机提交身份和 credential helper 已配置。
- [x] Python 依赖安装与完整版本锁定；`pip check` 通过。
- [x] React 构建和浏览器 → FastAPI 联调；中文、空输入、HTTP 422、模拟 HTTP 503 提示和恢复请求通过，正常流程无控制台错误/警告，390px 手机宽度无横向溢出。
- [x] Streamlit 备用界面载入、有效输入和空输入测试通过，服务健康接口 HTTP 200。
- [x] Git 忽略文件检查、源文件密钥格式扫描通过。
- [x] Vercel 连接可读，团队 `BOBOP1G` 下当前未返回项目；没有部署应用。
- [x] Git 本地初始提交。
- [x] 2026-10-23 已连接并成功推送到 `BOWEN2491/Hacking1024`，本机 Git 写入权限已验证。

## 需要你手动完成

1. **OpenAI 账单和预算**：登录 [Billing](https://platform.openai.com/settings/organization/billing) 和 [Limits](https://platform.openai.com/settings/organization/limits)，确认正确组织/项目、有可用额度，并设置你自己愿意承担的预算/告警。一次成功请求不代表整个周末都有足够余额；页面预算/告警也不要未经确认就当作硬性封顶。无需为了准备重新创建 Key。
2. **报名与 Discord**：确认你和队友都报名成功；从 [官方 Resources](https://hackohio2026.devpost.com/resources) 进入 Guidebook 和 Discord，确认赞助商题目、资格、所需数据/权限、提交 Form、Zoom 分组和现场签到要求。不要仅凭 Devpost 上的 Join 判断已完成主办方报名。
3. **GitHub 协作**：仓库 [BOWEN2491/Hacking1024](https://github.com/BOWEN2491/Hacking1024) 已创建，当前为公开仓库。邀请队友并让其接受邀请，再按 `TEAMMATE.md` 完成一次 clone/分支/PR 演练。不要在公开或共享录屏里输入凭据。
4. **队友验收**：把练习发给队友，让他独立启动，修改页面文字和错误提示，完成一个 PR。若他无法独立交付，让其比赛当天负责测试、素材和展示，你用 Streamlit 控制开发量。
5. **演示与部署账号**：试录 30 秒视频，检查窗口、声音、鼠标和视频链接权限；确认 Zoom 可登录。Vercel 连接已可用，无需为了这次准备重新注册。若决定需要公网展示，再确认 Vercel/后端托管或 Streamlit Community Cloud 的 GitHub 授权与环境变量配置。尚未验证任何云端部署。
6. **现场物品与网络**：电脑、充电器、证件、耳机、鼠标、转接头、热点和休息安排。准备一份演示输入、预期输出和失败时的录屏备份。

## 官方信息核对

- [赛事首页](https://hackohio2026.devpost.com/)：2026-10-24 至 10-25；页面列出的队伍人数为 2–4。
- [提交说明](https://hackohio2026.devpost.com/)：通过 Discord 发布的 **Google Form** 提交，Devpost 提交不计入评审；演示视频最长 3 分钟，随后 Zoom 问答。
- [公开时间表](https://hackohio2026.devpost.com/details/dates)：提交期为 **10 月 24 日 10:00 至 10 月 25 日 10:00 EDT**。建议团队自行设定 10 月 25 日 09:00 的内部截止，最终仍以主办方最新 Discord/Guidebook 公告为准。
- [赛前工作规则](https://hackohio2026.devpost.com/rules)：允许继续已有工作，但必须披露，评委只评估正式比赛期间的贡献。请保留 `PRIOR_WORK.md`。
- Sponsor 具体题目、免费 API credits、录屏/托管权限等未在此次准备中确认为已具备，不预设会发放。

## 比赛当天的最小范围

- 一个明确的问题、一条真实处理流程、可操作的演示、一个能说明的技术亮点。
- 先约定输入和输出 JSON，再并行做核心处理与界面。
- 每隔几小时保存可运行版本；留出录屏、说明和提交时间。
