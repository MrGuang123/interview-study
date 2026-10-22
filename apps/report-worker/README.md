# report-worker：报告、导出与异步执行

> 当前状态：依赖已安装，构建、lint、类型检查、1 个默认单测与 1 个 E2E 通过。采用独立 ESM + Vitest 配置；报告和队列业务尚未实现。

## 当前脚手架与命令

包名为 `@interview-forge/report-worker`。先在仓库根统一安装，再按阶段从根执行：

```sh
PORT=3003 pnpm --filter @interview-forge/report-worker run start:dev
pnpm --filter @interview-forge/report-worker run build
pnpm --filter @interview-forge/report-worker run lint
pnpm --filter @interview-forge/report-worker run test
pnpm --filter @interview-forge/report-worker run test:e2e
```

当前启动的是默认 HTTP 示例，尚无队列消费者、报告数据库或生成任务；未来纯执行进程可以另设入口。Observe 配置仍含凭据占位值，尚未验证云端关联。

测试环境关闭 Observe；当前 E2E 只覆盖默认 HTTP 路由。结果见 [首次检查](../../docs/runbooks/initial-verification.md)。

## 职责

- 生成确定性的练习统计、复盘报告与可下载导出文件。
- 管理报告任务状态、报告版本、导出结果、失败原因和消费去重记录。
- 使用 BullMQ 接收任务，并提供受保护的内部状态／报告读取 API，供 core-api 聚合给客户端。
- 记录任务与业务事件、报告结果和追踪上下文之间的关系，支持失败重试、对账和恢复。

## 边界

- 不直接修改 core-api 的回答、计划、复习或其他业务表；统计来源通过有版本的任务快照或所属服务接口获得。
- 任务失败不改变已经成功提交的答案。入队成功也不等于报告生成成功。
- Redis 队列不作为报告和任务结果的唯一真相；报告结果与去重记录持久保存到本服务数据库。
- 生成式 AI 内容由 ai-service 负责，需要时通过授权接口获取，不直接读取 AI 会话数据库。
- 同一业务未来可有 API 和 Worker 两个入口；分成两个进程不自动增加一个业务微服务。

## 候选目录

| 路径 | 内容 |
| --- | --- |
| `src/main.ts` | 内部状态 API 入口，启用 HTTP 时生成 |
| `src/worker.ts` | 队列执行入口，需要独立调度时增加 |
| `src/config/`、`database/` | 配置、数据库和对象存储适配 |
| `src/modules/jobs/` | BullMQ 消费、状态转换、重试与取消 |
| `src/modules/reports/` | 报告规则、版本、持久化与读取 |
| `src/modules/exports/` | 文件生成、下载授权与过期清理 |
| `src/modules/inbox/`、`clients/` | 消费去重与授权数据客户端 |
| `prisma/`、`test/integration/` | 自有模型／迁移、任务与存储集成验证 |

API 入口使用 Nest HTTP 应用；纯 Worker 可使用 application context。只有启用相应入口后才配置启动命令和健康检查，不放置假运行的空入口。

## 数据、协议与依赖

- 拥有独立 PostgreSQL reports database/schema、凭据和 Prisma 迁移；候选实体为 ReportJob、Report、ExportArtifact、ProcessedEvent。
- 导出文件使用归本服务管理的对象存储路径／元数据；客户端获取下载入口前再次检查权限，不能因拿到对象 ID 就下载他人文件。
- 队列契约包含 eventId／jobId、资源 ID、数据版本、报告规则版本和 traceId。载荷保持最小必要范围，私人回答不进入公开日志。
- 交付允许重复；以事件或业务键及唯一约束去重。Worker 中断后的恢复读取持久状态，不盲目创建第二份报告。
- 数据写入与外部文件上传分步执行时，设计中间状态、幂等对象路径及清理／对账，不能声称跨数据库与对象存储存在本地事务。
- 可依赖 `packages/contracts` 和生成／受控的 API 客户端；不导入其他应用源码或数据库 Client。

## 启用顺序与最小验收

1. 正式提交与 Outbox 链路稳定后再启用；早期简单统计可保持在核心模块中。
2. 同一提交产生一个可追踪的报告业务结果，前端区分等待、执行、成功和失败。
3. 同一事件重复投递、Worker 执行中退出后重启，不重复创建业务报告；失败原因和重试策略可查看。
4. core 或存储暂时不可用时有限退避；权限和无效输入失败不无限重试。
5. 通过状态 API 恢复权威结果，不依赖客户端必须收到实时完成通知。

完整范围见 [产品蓝图](../../docs/product-blueprint.md) 与 [目录指南](../../docs/project-structure.md)。
