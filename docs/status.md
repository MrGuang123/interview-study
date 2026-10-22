# 当前状态

最后核对：2026-10-21。

## 已建立

- 根目录唯一的协作约定 `AGENTS.md`，包含完整规则并供工具自动识别。
- pnpm workspace 根配置、工具版本基线、编辑规则与 Git 忽略规则。
- 五个目标应用的职责 README；四个共享包的职责 README。
- 运行配置、维护脚本、跨应用验证与运行手册的目录说明。
- 产品/学习设计、架构决定、目标代码结构与逐步搭建指南。
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
| Compose / Nginx / 观测 | 已创建职责文档 | 无运行配置 | 未验证 |
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
- 未启动 Docker 或真实模型调用；登录、权限、多端同步、数据库、性能、恢复与 AI 评测仍是待实现目标。

## 下一步

按 [首次检查手册](runbooks/initial-verification.md) 在两个终端分别启动 Web 与 core-api，手动访问默认页面和 API；随后接 PostgreSQL 与第一条业务链路。已有锁文件需提交，依赖升级单独验证。

App、桌面、小程序的具体实现框架，以及独立网关/BFF、协同编辑实现，仍按 [架构决定](decisions/0001-foundation-boundaries.md) 保持待评估。
