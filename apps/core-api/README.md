# core-api：身份、学习业务与查询聚合

> 当前状态：2026-10-28 用户确认 03A 完成，健康模块、AppModule 接入与 4 个健康 HTTP 测试已提交。Prisma Provider、User 模型、首迁移及读写验收脚本已存在；代理本轮未复验真实数据库停机/恢复。下一课 [03B：请求标识与错误响应](../../docs/lesson-03b-request-errors.md) 待用户手写，身份/学习业务链路尚未实现。

## 当前脚手架与命令

包名为 `@interview-forge/core-api`。先在仓库根统一安装；以下命令也从根执行，开发端口通过启动环境传入：

```sh
PORT=3001 pnpm --filter @interview-forge/core-api run start:dev
pnpm --filter @interview-forge/core-api run build
pnpm --filter @interview-forge/core-api run lint
pnpm --filter @interview-forge/core-api run test
pnpm --filter @interview-forge/core-api run test:e2e
```

当前提供默认示例与 `/health/live`、`/health/ready`，有 1 个默认单测和 5 个 HTTP E2E。Observe 已加入模块与启动钩子，凭据仍是占位值；云端关联、环境加载或停用方式在实际启用时处理，本轮没有连接监控账户。

入口已加载应用 `.env`，使用 forge_app 查询账号、数据库和 core 的 USAGE/CREATE 后才监听，并启用关闭钩子释放连接。CLI 读取独立迁移环境。[02C](../../docs/lesson-02c-first-migration.md) 的模型、迁移和读写/回滚验收脚本已存在，课程按用户反馈完成。03A 的 live 不查数据库，ready 查询 users；未就绪时返回 503 / `{"status":"not_ready"}`。03B 将增加请求 ID、完成日志和普通 HTTP 错误格式，当前尚未写入应用。

## 模块与导入约定

源码使用 `import` / `export`，相对导入省略扩展名，例如 `import { AppService } from './app.service'`。用户在 03A 中将应用改为不声明 package `type`、TypeScript 显式 `module: commonjs`，未声明 `moduleResolution`；当前 TypeScript 6.0.3 的有效默认解析为 Bundler，产物仍输出 CommonJS，由 Node 运行 `dist/main.js`。本轮沿用实际已提交配置，不要求恢复历史 NodeNext 方案，详见 [模块格式决定更新](../../docs/decisions/0002-core-api-extensionless-imports.md)。

Prisma 生成器使用 `moduleFormat = "cjs"`、`generatedFileExtension = "ts"`、`importFileExtension = ""`；修改生成器或换电脑后，先运行 `pnpm --filter @interview-forge/core-api run db:generate` 再构建，不手改生成目录。CLI 配置用 `__dirname` 定位迁移环境文件，入口使用 `void bootstrap()`。

Vitest 配置文件为 `vitest.config.mts`、`vitest.config.e2e.mts`，以 ESM 格式加载测试工具；这不改变应用的 CommonJS 输出。其他应用保留各自模块配置。原因与边界见 [模块格式决定](../../docs/decisions/0002-core-api-extensionless-imports.md)，完整手写代码见 [Prisma 教程](../../docs/lesson-02b-prisma-connection.md)。

`NODE_ENV=test` 时关闭 Observe，保持测试独立于托管服务。当前 E2E 使用 Prisma 替身，覆盖默认根路由和 4 个健康检查场景；真实数据库停止/恢复按 03A 用户完成反馈记录，不能由替身测试推断。历史默认脚手架结果见 [首次检查](../../docs/runbooks/initial-verification.md)。

## 职责

- 管理统一用户身份、登录方式、独立设备会话、工作空间、成员与对象权限。
- 管理题目及版本、学习计划、回答草稿、正式提交、评价、复习、预约与场次业务状态。
- 对 core 所属内容执行版本检查、幂等写入和同步冲突判定。
- 通过 REST 接收业务命令，通过 GraphQL 提供工作台等组合查询；必要时调用其他服务的授权接口。
- 在同一数据库事务中保存核心业务变化与 Outbox，再可靠投递后续任务。

## 边界

- core-api 是核心业务服务，不是拥有全部服务数据的全局聚合根。它的查询聚合不授予跨服务写表权限。
- Nginx 当前负责边缘入口；独立 API Gateway／BFF 仍是待评估项，不是已实现的服务。
- 不拥有 studio 的消息、场景和协同状态，不拥有报告与 AI 运行数据；不得直接查询或修改这些服务的数据库。
- `sync` 只协调本服务拥有的草稿等内容，不成为跨 PostgreSQL、MongoDB 和所有客户端的全局同步真相。
- 不默认采用 CRDT 合并正式提交、预约、权限或其他业务状态。未来内容协同不替代后端规则。

## 候选目录

| 路径 | 内容 |
| --- | --- |
| `src/main.ts`、`app.module.ts` | 应用启动与模块装配 |
| `src/config/`、`database/` | 本服务环境校验、Prisma Provider |
| `src/modules/identity/`、`devices/` | 用户、登录身份、会话创建／轮换／撤销 |
| `src/modules/workspaces/` | 成员、角色和对象权限上下文 |
| `src/modules/questions/` | 题目、不可变发布版本和可见范围 |
| `src/modules/practice/`、`submissions/` | 练习草稿、正式提交、状态和版本规则 |
| `src/modules/plans/`、`reviews/`、`interviews/` | 学习计划、复习、预约与场次业务 |
| `src/modules/sync/`、`outbox/` | core 内容同步协议、幂等、可靠事件发布 |
| `src/modules/dashboard/`、`clients/` | GraphQL 聚合与其他服务客户端 |
| `prisma/`、`test/integration/` | 自有模型与迁移、数据库集成验证 |

候选模块按实际业务逐步建立，不要求每项都成为单独 Module。简单模块先采用 Controller／Resolver → Service → Prisma 的清晰路径。

## 数据、协议与依赖

- 拥有 PostgreSQL core database/schema、独立凭据与迁移。候选实体包括 User、ExternalIdentity、DeviceSession、Workspace、Membership、QuestionVersion、PracticeAttempt、Submission、ReviewTask、InterviewSession、OutboxEvent。
- 同一用户可持有多台设备的独立会话。客户端提供的 userId、workspaceId、角色不能直接作为可信身份；对象访问由服务端检查。
- 同步与写命令校验基础版本、幂等键及请求摘要。正式提交与草稿保存分开，不因报告失败回滚已成功的提交。
- 跨服务调用带可信调用身份、超时和追踪上下文，并由资源所属服务再次授权。初期使用内部 HTTP；gRPC 只在选定链路实践，tRPC 不作为额外主干协议。
- Outbox 事件包含稳定事件 ID、类型、版本、资源 ID 和追踪信息；允许重复交付，消费者负责业务去重。
- 可依赖契约与受控 API 客户端；不导入其他应用的 `src`、Prisma Client、数据库连接或内部业务实体。

## 启用顺序与最小验收

1. 第一阶段与 Web 一起启用，完成登录、选题、回答、提交和复习闭环。
2. 两个用户不能访问彼此私有内容；同一账号可在两个设备会话使用，并单独撤销一个会话。
3. 同一操作重试不重复提交；基于旧版本保存明确返回冲突；非法输入有统一错误与关联日志。
4. 先在模块边界内实现协作、报告与 AI 的早期能力；只有契约、数据归属和真实调用链明确后，才提取独立服务。
5. 启用任务前验证“事务提交后中继退出、重复投递”的恢复行为；不以 Redis 永不丢数据作为唯一保证。

完整范围见 [产品蓝图](../../docs/product-blueprint.md) 与 [目录指南](../../docs/project-structure.md)。
