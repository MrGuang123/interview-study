# 文档导航

| 文档 | 用途 |
| --- | --- |
| [开发交接](handoff.md) | 新会话/换电脑的接手点、已确认决定与下一步 |
| [当前状态](status.md) | 区分已创建目录、可运行应用和已验证功能 |
| [新电脑开发](runbooks/new-machine-setup.md) | 从 Git 恢复代码、安装依赖并交给新的 Codex 会话 |
| [安装后的首次检查](runbooks/initial-verification.md) | 可复制的检查/启动命令与实际结果 |
| [逐步搭建指南](bootstrap-guide.md) | 从文档骨架生成 workspace、应用和运行依赖 |
| [UI 与交互设计](ui-and-interaction.md) | 已接受的渐变方向、全站静态图稿与首条链路的交互验收要求 |
| [全站 UI 图稿](../UI-design/README.md) | 17 类页面的浅深色桌面/H5 图稿、关键状态板与设计令牌入口；均为概念设计 |
| [页面与主题使用指南](ui-theme-guide.md) | 已建立的完整令牌源与待手写的 Tailwind v4 基础映射；渐变等完整集成仍待完成 |
| [阶段 2 实施清单](stage-2-first-slice.md) | 先设计 UI，再实现登录、题目、云端草稿链路的分步任务与验收 |
| [手写学习 01：PostgreSQL](lesson-01-postgresql.md) | 用户手写的完整配置、逐段说明、SQL 与持久化验证步骤 |
| [手写学习 02A：数据库账号](lesson-02-database-roles.md) | 管理/迁移/运行账号、schema 和真实登录/结构权限验证；尚待用户执行 |
| [手写学习 02B：Prisma 连接](lesson-02b-prisma-connection.md) | Prisma 7、双连接配置、Nest ESM 接入、测试调整与真实连接验收；尚待用户手写执行 |
| [目录详解](project-structure.md) | 应用内部目标结构、框架约定与依赖方向 |
| [基础架构决定](decisions/0001-foundation-boundaries.md) | 多端、同步、协议和服务边界的已确定/待定事项 |
| [产品蓝图](product-blueprint.md) | 页面、业务流程、部署、可靠性与安全目标 |
| [学习矩阵](learning-matrix.md) | 技术对应的需求、知识点与阶段验收 |
| [Worker、离线与 Agent](worker-offline-agent.md) | 浏览器后台、同步协议与 Nest/Mastra 专项 |
| [运行手册目录](runbooks/README.md) | 实际执行过的部署、排障、备份恢复步骤 |

应用或包的职责在各自 README 中维护。重大决定记录原因、替代方案和影响；实现状态只根据实际代码和验证更新，不能从设计文档推断。
