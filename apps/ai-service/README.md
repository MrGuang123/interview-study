# ai-service：AI 教练与受控 Agent 运行

> 当前状态：依赖已安装，构建、lint、类型检查、1 个默认单测与 1 个 E2E 通过。采用独立 ESM + Vitest 配置；Mastra、模型与 AI 业务尚未接入，模型供应商尚未确定。

## 当前脚手架与命令

包名为 `@interview-forge/ai-service`。先在仓库根统一安装，再按阶段从根执行：

```sh
PORT=3004 pnpm --filter @interview-forge/ai-service run start:dev
pnpm --filter @interview-forge/ai-service run build
pnpm --filter @interview-forge/ai-service run lint
pnpm --filter @interview-forge/ai-service run test
pnpm --filter @interview-forge/ai-service run test:e2e
```

当前只有默认 HTTP 示例，Mastra、模型和业务工具尚未接入。Observe 配置仍含凭据占位值，尚未验证云端关联。

测试环境关闭 Observe；当前 E2E 只覆盖默认 HTTP 路由。结果见 [首次检查](../../docs/runbooks/initial-verification.md)。

## 职责

- 提供回答复盘、模拟追问、授权材料检索、架构建议和学习计划草案。
- 管理会话、AgentRun、工具执行摘要、确认草案、预算、取消、运行状态与评测版本。
- 由 Nest 处理接口、可信身份、校验、授权、配额与业务客户端；Mastra 处理 Agent、Tools、Memory 和 Workflow。
- 长任务采用专用队列和后台执行入口，客户端关闭后仍能查询运行状态和结果。

## 边界

- Mastra 作为 Nest Provider 创建与注入，默认同进程、同镜像使用，不另开公开 Mastra HTTP 服务。
- API 与后台进程属于同一 AI 业务服务；多个 Agent、Workflow 或进程不自动成为额外微服务。
- core-api 和 studio-service 保持业务事实与对象权限的所有权；AI 通过受限接口读取与写入，不直接查询其他服务数据库。
- 模型输出和 prompt 不是授权依据。用户确认具体计划差异后，所属业务服务仍要验证权限、版本、确认范围和幂等。
- AI 失败、预算耗尽或模型未配置时，普通答题、自评和复习仍可使用。模型密钥只在服务端。

## 候选目录

| 路径 | 内容 |
| --- | --- |
| `src/main.ts`、`worker.ts` | Nest 接口入口与按需启用的后台入口 |
| `src/config/`、`database/` | 配置、AI 自有数据与运行时存储适配 |
| `src/modules/runs/` | 生命周期、预算、取消、确认与恢复 |
| `src/modules/conversations/`、`retrieval/` | 会话隔离与授权检索 |
| `src/modules/jobs/` | BullMQ 调度、交付重试与执行入口 |
| `src/mastra/mastra.provider.ts` | 创建与注入可复用 Mastra 实例 |
| `src/mastra/agents/`、`tools/`、`workflows/`、`memory/` | 角色、受限工具、步骤与持久化配置 |
| `src/clients/` | core-api／studio-service 授权调用适配 |
| `prisma/`、`evals/`、`test/integration/` | 自有模型／迁移、固定评测集与集成验证 |

## 数据、协议与依赖

- 拥有独立 PostgreSQL ai database/schema、凭据和迁移；候选实体为 Conversation、AgentRun、ToolExecution、PlanProposal、UsageRecord、EvalVersion。
- Mastra 的 Memory／Workflow 存储同样由 AI 边界管理。应用记录与框架运行记录建立关联，避免两份互不协调的会话真相。
- 共享 Provider 只保存配置和可复用依赖；用户、工作空间、会话、授权范围和预算按每次运行传入，不通过修改全局 Agent 状态切换用户。
- 流式输出使用带 runId、seq 和 type 的事件；断线后查询持久状态，连接关闭不等于执行已经停止。
- AgentRun 关联 queueJobId 与 workflowRunId。BullMQ 负责交付与调度，Workflow 负责步骤和确认后继续；恢复时推进同一运行，不默认从头重做。
- 工具副作用使用稳定业务幂等键；配置最大步骤、超时、重试范围与总预算，防止队列、工作流和模型重试层层相乘。
- 可依赖 `packages/contracts`、`simulation-core` 与授权 API 客户端，不导入其他服务数据库模型／连接或 Web 组件。
- 开发期模型请求、追踪和评测使用最小必要资料；不把私人回答、密钥或完整上下文无差别写日志。

## 启用顺序与最小验收

1. 先有稳定的身份、答题和权限接口，再做小型只读生成／流式功能；初期可以保留在清晰的 Nest 模块，之后独立部署。
2. 可选短原理练习只验证模型—工具循环，不维护第二套正式 Agent 运行时。
3. 两个账号并发运行不串会话或检索内容；资料中的指令不能让工具越权；工具参数和输出接受运行时校验。
4. 计划修改必须经过可查看的草案确认；重复请求和进程恢复不重复修改业务数据。
5. 长任务、等待确认和进程重启能恢复；取消、超时和预算耗尽有明确状态。
6. 固定评测覆盖正常、资料不足、越权、恶意资料、工具超时、拒绝确认、重复执行和会话恢复；变更模型、prompt 或工具后重跑。

完整范围见 [产品蓝图](../../docs/product-blueprint.md)、[目录指南](../../docs/project-structure.md) 与 [Agent 详细设计](../../docs/worker-offline-agent.md)。
