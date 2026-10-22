# 面试工坊 / Interview Forge

一个以 React、TypeScript、Node.js 为主线的面试学习平台。通过个人练习、面试房间、架构实验和 AI 教练，练习完整业务交付、多端同步、测试、部署与排障。

## 当前状态

五个应用已完成统一依赖安装，代码检查、类型检查和生产构建通过；四个 Nest 应用的默认单元测试与 E2E 通过。**浏览器交互、前后端业务调用、数据库及产品功能尚未实现或验证。** 完成详情见 [状态表](docs/status.md)。

根 `package.json` 固定 pnpm 版本并标记私有 workspace；没有伪造的根 `dev`、`build` 或 `test` 命令。五个应用已具备自己的清单与脚本，包名为 `@interview-forge/<目录名>`；共享包仍只有职责文档，尚未成为可构建包。

## 从哪里开始

1. 阅读 [AGENTS.md](AGENTS.md)，了解本项目的协作规则与架构边界。
2. 当前已安装并完成首次自动检查，按 [首次检查手册](docs/runbooks/initial-verification.md) 复核命令及手动启动；换电脑先看 [开发交接](docs/handoff.md) 和 [新电脑开发手册](docs/runbooks/new-machine-setup.md)，无需重新生成应用。
3. 对照 [目录详解](docs/project-structure.md) 整理生成目录，保留每个应用的 README。
4. 首先连通 Web → core-api → PostgreSQL；其余目标服务先有明确职责，再按阶段启用。

## 换电脑或新会话继续

项目上下文随源代码保存在根 `AGENTS.md`、[交接说明](docs/handoff.md)、[状态表](docs/status.md) 和架构文档中，无需依赖某一段聊天。将这些文件与锁文件一同提交、推送，在另一台电脑拉取后，按 [新电脑开发手册](docs/runbooks/new-machine-setup.md) 安装并验证；其中提供可直接给新 Codex 会话使用的开场提示。

## 仓库地图

```text
interview-study/
├── AGENTS.md                    唯一的项目协作约定，供工具自动识别
├── apps/
│   ├── web/                     Next.js：Web/H5 界面
│   ├── core-api/                Nest：身份、设备、题库、训练与提交
│   ├── studio-service/          Nest：房间、消息、架构场景
│   ├── report-worker/           Nest：报告、导出与异步处理
│   └── ai-service/              Nest + Mastra：教练、Agent 与运行管理
├── packages/
│   ├── contracts/              有版本的接口、事件与实时消息契约
│   ├── design-tokens/          平台中立的视觉规范
│   ├── simulation-core/        纯 TypeScript 教学模拟模型
│   └── api-client/             按实际复用生成的客户端与类型
├── infra/                      Compose、Nginx、观测配置职责
├── scripts/                    环境检查、备份与恢复脚本职责
├── tests/                      跨应用流程、契约与压测职责
├── docs/                       蓝图、决定、指南和状态
├── package.json
├── pnpm-workspace.yaml
├── .node-version
├── .editorconfig
└── .gitignore
```

这里展示的是已经建立的目录；五个应用已有官方脚手架 `src/`、配置与脚本，其 README 说明职责和后续代码组织。共享包、数据库迁移、Dockerfile 与 CI 配置按阶段加入，不能把目标功能树误认为已有实现。

## 应用职责入口

| 应用 | 文档 | 启用顺序 |
| --- | --- | --- |
| web | [Web/H5](apps/web/README.md) | 第一批 |
| core-api | [核心业务](apps/core-api/README.md) | 第一批 |
| studio-service | [协作与场景](apps/studio-service/README.md) | 多人房间与场景阶段 |
| report-worker | [报告与任务](apps/report-worker/README.md) | 异步可靠性阶段 |
| ai-service | [AI 教练](apps/ai-service/README.md) | 业务数据和授权接口可用后 |

其他入口：[共享包](packages/README.md)、[运行配置](infra/README.md)、[维护脚本](scripts/README.md)、[跨应用验证](tests/README.md)、[文档导航](docs/README.md)。

## 版本与复现

本轮实际检测到 Node `24.19.0`、pnpm `11.22.0`，用作初始工具基线；这不代表所有框架和 Mastra 已通过集成验证。首次直接用 `@latest` 生成脚手架，安装后通过实际依赖清单和根锁文件复现项目，后续升级单独处理。遇到具体兼容问题时再定位；确需调整工具基线时同步 `.node-version`、根 `package.json` 和指南。

根 `pnpm-lock.yaml` 已生成，应随源代码提交。每个 Nest 应用使用独立 CLI standard-mode 配置；不维护应用内部锁文件，不创建嵌套仓库。首次构建与测试已验证，临时 `.scaffold/` 不参与工作区和运行，可按需清理。
