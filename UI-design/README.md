# 面试工坊 UI 设计目录

日期：2026-10-22。这里集中保存整站 **17 类页面的浅色/深色静态概念稿**、关键异常状态板、原始参考图与生成提示词。页面稿每种主题各一张，**同一张板包含桌面和 H5**，用于比较信息层级与手机改版方式。

所有人物、题目记录、时间、分数、运行指标与操作结果均为示例数据。图片不是可点击原型，没有真实 API、身份验证、保存、同步、AI 或运维能力；实际实现情况仍看 [项目状态](../docs/status.md)。页面功能与异常的文字约定见 [交互规范](interaction-spec.md)。

## 页面索引

首条真实链路仍先实现登录、题库、我的练习、答题四页。整站设计提前表达后续方向，不改变阶段交付顺序。标注“路由建议”的路径尚需在对应业务阶段固定；图片生成的额外菜单、小字或标签，不会自动成为正式路由或已承诺功能。

| 页面 | 功能范围 | 路由 / 阶段 | 浅色 | 深色 |
| --- | --- | --- | --- | --- |
| 登录 | 登录标识、密码、错误提示、重新登录并返回目标练习 | `/login`<br>首条链路 | [查看](pages/01-login/light-v2.png) | [查看](pages/01-login/dark.png) |
| 学习工作台 | 今日复习、最近回答、工程任务、下一场面试；分区独立加载 | `/app`<br>后续阶段 | [查看](pages/02-dashboard/light.png) | [查看](pages/02-dashboard/dark.png) |
| 题库 | 搜索、分类标签、分页、新练习与继续练习 | `/questions`<br>首条链路 | [查看](pages/03-questions/light-v2.png) | [查看](pages/03-questions/dark.png) |
| 题目详情 | 题干、资料、知识关系、发布版本、自己的历史练习 | `/questions/[slug]`<br>后续阶段 | [查看](pages/04-question-detail/light.png) | [查看](pages/04-question-detail/dark.png) |
| 我的练习 | 仅自己的练习、云端保存时间、草稿/提交状态、继续 | `/app/practice`<br>首条链路 | [查看](pages/05-my-practice/light.png) | [查看](pages/05-my-practice/dark.png) |
| 答题工作区 | 题干、编辑、手动保存、快照状态、提纲与自测 | `/app/practice/[attemptId]`<br>首条链路 | [查看](pages/06-practice-editor/light.png) | [查看](pages/06-practice-editor/dark.png) |
| 复盘与报告 | 不可变提交、自评/互评、报告状态、复习安排 | `/app/practice/[attemptId]/review`<br>后续阶段；路由建议 | [查看](pages/07-practice-review/light.png) | [查看](pages/07-practice-review/dark.png) |
| 模拟面试大厅 | 预约、邀请、场次角色、时间与题集 | `/app/rooms`<br>后续阶段 | [查看](pages/08-rooms/light.png) | [查看](pages/08-rooms/dark.png) |
| 模拟面试房间 | 服务端计时、文字消息、共同题目、画布编辑锁、连接恢复 | `/app/rooms/[roomId]`<br>后续阶段；详情路由建议 | [查看](pages/09-room-detail/light.png) | [查看](pages/09-room-detail/dark.png) |
| 系统设计实验室 | 2D/3D画布、节点与属性、实验参数、时间线、模拟假设 | `/app/lab`<br>后续阶段 | [查看](pages/10-lab/light-v2.png) | [查看](pages/10-lab/dark-v2.png) |
| 小组与共享计划 | 小组切换、成员与角色、共享计划、互评任务、工程证据 | `/app/groups`<br>后续阶段 | [查看](pages/11-groups/light.png) | [查看](pages/11-groups/dark.png) |
| 项目档案 | 仅用户选定的公开成果、英文说明、版本证据、分享范围 | `/portfolio/[slug]`<br>后续阶段 | [查看](pages/12-portfolio/light.png) | [查看](pages/12-portfolio/dark.png) |
| 离线与同步 | 版本题包、下载、本地草稿、待同步与冲突处理 | `/app/offline`<br>后续阶段 | [查看](pages/13-offline/light.png) | [查看](pages/13-offline/dark.png) |
| AI学习教练 | 流式对话、引用、工具摘要、修改计划差异与确认、取消 | `/app/coach`<br>后续阶段 | [查看](pages/14-coach/light.png) | [查看](pages/14-coach/dark.png) |
| 管理与运行中心 | 失败任务、追踪、发布和备份恢复演练记录；受控运维 | `/ops`<br>后续阶段 | [查看](pages/15-ops/light.png) | [查看](pages/15-ops/dark.png) |
| 账号与设备 | 身份资料、独立设备会话、撤销设备、主题与减少动效偏好 | `/app/settings`<br>配套设计；路由建议 | [查看](pages/16-settings/light.png) | [查看](pages/16-settings/dark.png) |
| 题目编辑与发布 | 内容编辑、预览、版本差异、草稿校验与发布确认 | `/ops/questions/[questionId]/edit`<br>配套设计；路由建议 | [查看](pages/17-question-editor/light.png) | [查看](pages/17-question-editor/dark.png) |

登录与题库以 `light-v2.png` 为当前浅色稿；实验室以 `light-v2.png`、`dark-v2.png` 为当前稿，H5 使用不带连接箭头的节点列表，连接关系以桌面架构图为准。历史图片保留生成过程。目录的机器可读清单见 [manifest.json](manifest.json)，每页目录的 `prompts.json` 记录该页的生成/修改提示词与引用图。

## 已认可的原始方向

用户先认可答题工作区的布局，再接受蓝紫渐变的浅深外观。两张原始图作为全站风格参考保存在：

- [答题工作区 · 原始浅色](references/practice-editor-light.png)
- [答题工作区 · 原始深色](references/practice-editor-dark.png)

原始图是方向参考，不覆盖首版“纯文本输入、手动保存”的业务范围；图中的富文本工具、提纲或自测展示也不代表这些功能已经开发。

## 关键交互状态板

每张状态板由四个可读 UI 局部组成，并标记“设计稿 · 示例数据”。浅深两版保持相同场景和信息层级。

| 状态板 | 场景 | 浅色 | 深色 |
| --- | --- | --- | --- |
| 身份与读取 | 加载骨架、筛选为空/清除筛选、读取失败/重试、会话过期/页内保留编辑与重新登录 | [查看](states/auth-and-data-light.png) | [查看](states/auth-and-data-dark.png) |
| 保存与冲突 | 保存失败保留输入、409 人工比较/合并、离开前确认、旧快照确认后新输入仍未保存 | [查看](states/save-and-conflict-light.png) | [查看](states/save-and-conflict-dark.png) |

保存状态板第 04 格把“请求仍在进行时继续输入”和“旧快照收到确认”两个时刻放在同一示例里说明。实现时必须按时序切换；不能同时显示“正在保存 S1”和“S1 已保存”，也不能把新输入误标为已保存。详细状态与 401、409 行为见 [交互规范](interaction-spec.md)。完整状态板提示词见 [states/prompts.json](states/prompts.json)。

## 从图片到代码

实施规范的权威值在 [`packages/design-tokens/src/tokens.json`](../packages/design-tokens/src/tokens.json)，单位、引用、对比度计算与映射边界见 [令牌包 README](../packages/design-tokens/README.md)。图稿只表达方向，不能逐像素反推颜色、高度、边距或圆角。

- 共享底色、文字与控件使用语义令牌；蓝紫渐变用于主操作与低强度背景柔光，题干和编辑区保持纯色。
- 桌面参考侧栏 192、顶栏 72、主间距 22；H5 使用单列、分段或抽屉等改版，不能把桌面三列缩成小字。控件的交互目标至少 44；安全区域来自实际设备。
- 图片生成可能出现局部色差、文字误差、控件尺寸、按钮状态或对齐细节不一致。实现时按文字规范和令牌修正，再验收真实内容、键盘焦点、对比度、窄屏、文字放大和减少动效。
- 浅色渐变按钮终点的实施值为 `#745edb`，装饰紫仍为 `#7c66e8`；这个轻微差别用于保证普通白字按钮的对比度。深色按钮使用 `#9eaafa → #baabf8` 与深色文字。
- 令牌已经落文件，CSS 生成器、Tailwind 映射及页面接入仍需后续实现。[主题使用指南](../docs/ui-theme-guide.md) 介绍接入方式，不能把图片或 JSON 的存在当成 Web 主题已启用。

## 生成来源与复查

所有页面与状态板使用**内置 `image_gen`** 生成，页面风格与常用约束记录在 [prompt-base.txt](prompt-base.txt)；逐页提示词位于相应 `pages/<id>/prompts.json`，状态板位于 [states/prompts.json](states/prompts.json)。暗色稿基于对应浅色稿进行主题转换，保留布局与内容。原始生成文件按提示词记录追溯，最终项目引用使用本目录内的图片。

本目录的设计覆盖正常页面和若干关键异常示例，仍需通过真实可交互页面验证完整流程。API 权限、云端保存、并发、任务恢复、消息持久化、离线兼容与 AI 写入确认，必须随各阶段实现和故障验证完成后才能列为已交付能力。

最终文件核对见 [validation-report.json](validation-report.json)：34 张选定页面板、4 张状态板、2 张原始参考均存在，历史版本另行保留；检查了 PNG 完整性、尺寸、JSON、令牌引用和配色计算。令牌包 README 记录初审结果，验证报告另含独立复核的 54 项配色检查；二者都不是浏览器或业务验收。
