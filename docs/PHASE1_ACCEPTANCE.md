# Buckeye Baton — v2 第一轮验收

2026-10-24。范围：首页与三状态项目交互。**本地验收通过：类型检查、后端 3/3、生产构建、浏览器 5/5（10.4 秒）。** 完整接棒和项目引荐目标见 ACCEPTANCE.md，本轮不验收这些真实写操作。

## 固定数据

- Alex、Mia、Sarah、Kevin 四个演示身份；身份切换不是生产认证。
- `project-events`：Mia 的旧 Ongoing 项目，reflection 为 null。
- `project-signup`：Alex 的旧 Finished 项目，reflection 为 null；旧经验内联显示 Historical experience。
- `project-v2-finished`、`project-v2-paused`：独立虚构状态样例。种子只插入缺少 ID，不覆盖已编辑记录。

## 浏览器剧本

1. 首页搜索、All / Ongoing / Finished / Paused 筛选；无结果显示空状态。没有独立 Lessons 标签。卡片标题和 View 都进入对应项目。
2. Alex 创建项目，默认 Ongoing。编辑进展；选择 Finished，只填成果提交，验证失败、输入保留且数据库仍为 Ongoing。补下一组建议，添加完整问题经验后保存并刷新。
3. 重复成果添加两项再移除第二项，保存后只保留第一项。将项目改 Paused，缺重做建议失败；补原因、重做建议与可复用链接后保存并刷新。
4. 返回 Ongoing，进展正常显示；服务端数据仍保留 Finished 成果和问题、Paused 原因及材料。
5. 换 Mia 后不能编辑 Alex 项目。筛选状态和未保存表单在身份切换时清空，返回未筛选首页；刷新保留选定身份及已保存项目内容。
6. Finished / Paused 的接棒按钮只原地显示下一轮提示；Kevin 引荐按钮、Sarah 指导按钮同样仅提示，无写请求、无空白页或假数据。
7. 访问 /lessons/lesson-fields（含旧 #discussion 链接）跳回来源项目；首页、三状态项目详情与三个角色工作台没有 /lessons/ 链接、采用表单、采用数字或反馈统计。旧经验继续内联显示。
8. 桌面 1400×900 和手机 390×844 浏览首页及三个状态详情，无横向溢出、客户端异常或框架覆盖错误。保留实际导师参与的空状态，不伪造评论。

## 后端与数据

- 所有者权限、身份错误、Finished/Paused 必填规则、非法材料链接、合并后的 PATCH 内容校验。
- 部分 reflection 更新与状态同事务保存，遗漏字段保留，数组更新替换该数组，过去状态内容不丢失。
- 重复初始化/迁移后旧数据、评论、引荐、采用与用户编辑仍在。nullable JSONB 字段为增量迁移，不重建项目表。
- 独立 Lesson 页面重定向来源项目；采用写接口无论是否携带身份均返回 410，且不修改数据库。项目详情仅返回 project / lessons，经验详情仅返回 lesson / project。旧记录保留；本轮不创建项目问题、接棒关系或项目级引荐。

## 命令与证据

Node 22：`npm run typecheck`、`npm run test:backend`、`npm run build`，之后 `npm run test:e2e`（独立生产进程和临时 PGlite 数据库）。正式预览进程单独运行，不共享测试库。

Browser plugin not available；使用仓库 Playwright 工作流。设置 QA_SCREENSHOT_DIR 可保存首页及三个详情的浏览器截图。协调方已实测通过五个浏览器场景：创建/编辑与三状态保存、筛选/旧经验/手机详情、身份重置、无写请求占位，以及旧链接重定向和采用界面移除回归。正式本地库保留全部 4 个原项目（ID/标题/状态不变、reflection 仍 null），仅新增 2 个状态样例。PGlite 本地通过不代表真实 Neon/AWS 或公网部署通过。


验证日期：2026-10-24，Node 22，隔离测试生产服务 3100。桌面 1400×900 和手机 390×844 的首页及三状态详情截图已由 Playwright 保存至外部 phase1-qa 目录；独立视觉复核由协调方执行。未验证完整 v2 接棒、项目引荐、云端数据库或公网部署。

清理后复核：正式本地 3000 服务已重启；旧 /lessons/lesson-fields#discussion 实际跳转 /projects/project-signup#discussion，旧采用界面匹配数 0、pageerror 0。项目文档已重新抓取 8 张实际页面截图。缺失 Lesson 的 404 是实现规则，未另做本轮浏览器验收。
