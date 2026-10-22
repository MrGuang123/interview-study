# 当前状态

进度与文档最后核对：2026-10-22；下列脚手架自动检查记录仍来自 2026-10-21，本轮未重跑应用检查。

## 已建立

- 根目录唯一的协作约定 `AGENTS.md`，包含完整规则并供工具自动识别。
- pnpm workspace 根配置、工具版本基线、编辑规则与 Git 忽略规则。
- 五个目标应用的职责 README；四个共享包的职责 README。
- 运行配置、维护脚本、跨应用验证与运行手册的目录说明。
- 产品/学习设计、架构决定、目标代码结构与逐步搭建指南。
- 阶段 2 实施建议和 UI/交互文档已建立；用户已接受当前预览为 UI v0，共同样式基线已记录。正式四页线框、完整视觉稿/原型与设计令牌实现尚未完成，预览仍为模拟数据。
- PostgreSQL 手写学习第一课按用户反馈完成：用户已亲手创建 Compose、环境示例与本地配置，并确认 SQL 读写及 `down`/`up` 后数据保留正常。代理前次只读核对容器为 healthy；SQL 与重建验证由用户执行。
- 换电脑/新会话的交接入口与新电脑开发手册；尚未在第二台电脑执行安装和验证。

五个官方脚手架已迁入正式 `apps/` 并统一安装依赖。**五个应用的 lint、类型检查与生产构建通过，四个 Nest 应用默认单元测试和 E2E 通过；业务与浏览器交互尚未验证。**

## 实现状态

| 项目 | 目录与职责 | 脚手架/运行 | 业务/集成验收 |
| --- | --- | --- | --- |
| web | 已创建 | 已安装；lint、typegen、类型与构建通过 | 浏览器交互/业务未验证；尚无测试脚本 |
| core-api | 已创建 | 已安装；构建、lint、类型、1 单测及 1 E2E 通过 | 仅验证默认 HTTP 示例 |
| studio-service | 已创建 | 已安装；构建、lint、类型、1 单测及 1 E2E 通过 | 仅验证默认 HTTP 示例 |
| report-worker | 已创建 | 已安装；构建、lint、类型、1 单测及 1 E2E 通过 | 仅验证默认 HTTP 示例 |
| ai-service | 已创建 | 已安装；构建、lint、类型、1 单测及 1 E2E 通过 | 仅验证默认 HTTP 示例 |
| contracts / design-tokens / simulation-core / api-client | 已创建职责文档 | 未生成可构建包 | 未开始 |
| Compose / PostgreSQL | 已创建职责文档与开发配置 | PostgreSQL 18.6 Alpine 已启动且健康 | 用户确认 SQL 读写、重建后保留通过；应用集成未开始 |
| Nginx / 观测 | 已创建职责文档 | 无运行配置 | 未验证 |
| 备份 / 恢复 / CI / 跨应用测试 | 已创建职责文档 | 无执行配置 | 未验证 |

## 已核对与未执行

- 已核对本机 Node `v24.19.0`、pnpm `11.22.0`，据此创建初始工具配置。
- 已检查文档的本地链接、代码围栏、根 JSON 与 workspace 范围；本地文档引用均可解析。
- 已执行 `pnpm -r --include-workspace-root list --depth -1 --json`，根与五个应用均可识别；共享包仍无清单。
- 已检测到根 Git、依赖目录和单一根锁文件；五个应用安装正常。
- 用户已执行 Next/Nest CLI，并生成 `.scaffold/web`、`core-api`、`studio-service`、`report-worker`、`ai-service`。
- 迁入后逐文件比较，五个应用共 75 个应迁文件均存在且与源一致；随后仅规范包名并补充 Web 的 `.env.example` 忽略例外。未发现子工作区、子锁文件、嵌套 Git 或额外正式 AGENTS.md。
- Next 临时工作区中的依赖构建策略已保留在根配置，框架使用说明已整理进应用 README；`.scaffold/` 不参与工作区，首轮验证已完成，可以清理。本次检查仍保留它。
- 四个 Nest 模板均为 ESM + Vitest，并加入 `@nestjs/observe`；清单声明 Nest 12.x、Observe 0.3.x，已检查配置。Observe 仍有凭据占位值，不能据此认定已关联云端监控。
- 已读取实际安装依赖：Next 16.4.2、React 19.3.0、Nest 12.2.0、Vitest 4.1.12、Observe 0.3.16；Web TypeScript 已修正为 5.9.3，后端为 6.0.3。
- 五个应用构建、lint、类型检查通过，四后端合计 4 个单测及 4 个 E2E 通过。Web 已先执行 `next typegen`；Web 没有测试脚本，浏览器交互未验证。
- 本次修正 Web TypeScript 版本及根锁文件、Next 的 `agentRules: false`，并在四个后端测试环境关闭 Observe；未关联监控账号。当前 SDK 会识别默认凭据占位并不发送遥测。
- 字体联网、pnpm 全局索引和测试端口曾受执行环境限制，按实际权限重跑后最终通过，没有把环境失败计为项目测试结果。
- 2026-10-22 代理只读核实 Docker context 为 `desktop-linux`，Compose 项目为 `interview-forge-dev`；`postgres` 服务使用 `postgres:18.6-alpine`，状态为 running、健康状态为 healthy，端口为 `127.0.0.1:5432 → 5432/tcp`，挂载一个命名卷。
- 同日用户执行第一课的 SQL 读写与容器 `down`/`up` 后数据保留验证，并反馈“一切正常”；按用户确认记录该课完成。代理未自动执行 SQL 或重建容器；命名卷保留不等于备份恢复通过。
- 已提供 [手写学习 02：数据库角色与权限](lesson-02-database-roles.md)，本轮尚未执行角色配置、结构权限验收或安装 Prisma。
- 尚未接入 Prisma 或真实模型调用；登录、权限、多端同步、数据库业务集成、性能、备份恢复与 AI 评测仍是待实现目标。

## 下一步

按 [手写学习 02](lesson-02-database-roles.md) 由用户手写创建 `forge_migrator`、`forge_app` 与 `core` schema，验证真实密码登录和结构权限，再进入 Prisma 集成。同时按已接受的 [UI v0](ui-and-interaction.md) 逐步完善首批页面与异常交互；不再把选择主题作为未完成前置。[首次检查手册](runbooks/initial-verification.md) 中浏览器脚手架手动检查仍待执行，依赖升级单独验证。

App、桌面、小程序的具体实现框架，以及独立网关/BFF、协同编辑实现，仍按 [架构决定](decisions/0001-foundation-boundaries.md) 保持待评估。
