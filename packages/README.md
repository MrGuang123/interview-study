# 共享包

当前只有职责文档，尚无 `package.json`、构建产物或可导入模块。实现时各包使用 `@interview-forge/<目录名>` 作为 workspace 名称，引用使用 `workspace:*`。

| 目录 | 职责 | 首次实现时机 |
| --- | --- | --- |
| [contracts](contracts/README.md) | 有版本的共享消息、事件、任务和同步契约 | 第一个跨边界契约出现时 |
| [design-tokens](design-tokens/README.md) | 平台中立的视觉规范及平台映射 | Web 开始统一主题时 |
| [simulation-core](simulation-core/README.md) | 纯 TypeScript 的教学模拟模型与计算 | 架构实验和计算 Worker 阶段 |
| [api-client](api-client/README.md) | 客户端契约生成和实际复用的调用适配 | API 稳定且出现复用需求时 |

应用可以依赖共享包，包不反向依赖应用，不跨应用导入内部源码。初期不要创建通用 `utils`、共享数据库客户端或全站业务 Service 包。仅被某个应用使用的功能先保留在该应用。

各包显式声明入口、运行环境、依赖和检查命令；Next、Nest、Worker 与未来原生客户端不强制共用一份模块配置。构建依赖的包先于其消费者构建，或在消费者中明确配置源码转译，不能依赖碰巧能解析的 TypeScript 路径别名。
