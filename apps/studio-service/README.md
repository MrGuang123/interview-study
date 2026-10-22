# studio-service：实时房间与架构场景

> 当前状态：依赖已安装，构建、lint、类型检查、1 个默认单测与 1 个 E2E 通过。采用独立 ESM + Vitest 配置；实时房间等业务尚未实现。

## 当前脚手架与命令

包名为 `@interview-forge/studio-service`。先在仓库根统一安装，再按阶段从根执行：

```sh
PORT=3002 pnpm --filter @interview-forge/studio-service run start:dev
pnpm --filter @interview-forge/studio-service run build
pnpm --filter @interview-forge/studio-service run lint
pnpm --filter @interview-forge/studio-service run test
pnpm --filter @interview-forge/studio-service run test:e2e
```

当前仍是默认 HTTP 示例，Socket.IO、MongoDB 与 Redis 尚未接入。Observe 配置仍含凭据占位值，尚未验证云端关联。

测试环境关闭 Observe；当前 E2E 只覆盖默认 HTTP 路由。结果见 [首次检查](../../docs/runbooks/initial-verification.md)。

## 职责

- 管理房间消息、架构场景、场景版本快照、操作记录和教学模拟配置／结果。
- 通过 Socket.IO 提供消息、在线状态、切题通知和画布操作，通过接口提供持久数据读取与恢复。
- 保存与渲染器无关的场景数据：稳定节点 ID、连接、坐标、参数与 schemaVersion。
- 在权限、持久化和版本基础上逐步增加协同能力；第一版可采用单人编辑锁或版本冲突检测。

## 边界

- core-api 拥有用户、工作空间、预约、场次成员与角色等权威业务数据；studio 通过其接口验证权限，不直接读 core 数据库。
- 实时连接不构成永久授权；成员退出、角色变化和会话撤销后，需要让既有连接失效或重新鉴权。
- Redis 在线状态、Pub/Sub 和 Socket.IO adapter 不是消息历史或文档真相。
- 不持久化 Three.js 实例，不把教学模拟数值宣称为平台真实压测结果。
- 未来 CRDT 只用于指定内容的协同编辑，不自动同步整个业务系统、权限或正式提交。

## 候选目录

| 路径 | 内容 |
| --- | --- |
| `src/config/`、`database/` | 服务配置、MongoDB 连接与存储适配 |
| `src/modules/rooms/` | 房间上下文、进入／退出与授权 |
| `src/modules/messages/` | 消息持久化、去重、序号与补拉 |
| `src/modules/scenes/` | 场景内容、基础版本、快照和格式迁移 |
| `src/modules/presence/` | 临时在线状态、心跳与过期 |
| `src/modules/simulations/` | 模拟参数、模型版本、回放结果 |
| `src/clients/` | core-api 等授权业务客户端 |
| `migrations/`、`test/integration/` | Mongo 数据／索引演进与服务集成验证 |

## 数据、协议与依赖

- 拥有 MongoDB studio 数据库及其索引／迁移；候选文档为 RoomMessage、SceneDocument、SceneSnapshot、SceneOperation、SimulationRun。使用 Mongoose 或官方驱动，不复用 core 的 Prisma 模型。
- Redis 只保存允许过期或可重建的在线状态和消息分发信息。队列、在线状态和缓存的命名空间及可靠性策略需要区分。
- 消息带 clientMessageId；服务端鉴权、去重、持久化并分配 roomSeq 后再确认／广播。重连按最后确认游标补拉，并处理重复与乱序。
- 场景读写校验资源权限、基础版本和内容格式。未来协同模型迁移必须处理旧客户端与滞留离线草稿，不能允许旧整文档覆盖新协同状态。
- Socket.IO 与原生 WebSocket 协议不等同；App、小程序适配前验证客户端兼容，必要时另做适配，不假设浏览器 SDK 通用。
- 可依赖 `packages/contracts` 和 `simulation-core`，不得导入 Web 的 React／Three.js 组件或其他服务内部源码。

## 启用顺序与最小验收

1. 核心登录、场次和对象权限稳定后启用房间；可先在 core 的清晰模块中验证，再提取独立部署。
2. 两名用户在同一房间收发消息；第三名无权限用户不能进入、读取或写入。
3. 重复发送、断线重连、服务重启后消息不重复且历史可恢复；临时在线状态过期后可重建。
4. 场景保存／加载不依赖 Three.js；并发旧版本写入有冲突提示，刷新不丢已确认数据。
5. 增加副本前验证连接亲和、分发和权限失效；引入 CRDT 前先用同一场景做并发与离线恢复原型。

完整范围见 [产品蓝图](../../docs/product-blueprint.md)、[目录指南](../../docs/project-structure.md) 与 [Worker／离线设计](../../docs/worker-offline-agent.md)。
