# 面试工坊：目录结构与渐进搭建指南

> 状态：五个应用已安装并通过 lint、类型与构建检查，四后端默认单元/E2E 测试通过。共享包和基础设施仍是职责骨架；下方完整源码树是演进目标，不是现存功能清单。
> 第一阶段优先运行 Next.js Web 与 NestJS core-api，先做登录、选题、回答和复习闭环。其他应用已有启动模板，业务模块与运行依赖按阶段加入。
> 基础约束以 [0001-foundation-boundaries.md](./decisions/0001-foundation-boundaries.md) 为准；实际操作顺序见 [bootstrap-guide.md](./bootstrap-guide.md)，各应用与包的 README 说明自己的职责和状态。

## 1. 仓库组织原则

采用 pnpm workspace，在一个 Git 仓库中管理多个应用与少量共享包。前端和四个业务微服务可以独立构建、运行与部署，不要求拆成五个 Git 仓库。

当前选择是 **pnpm monorepo 内包含多个 Nest CLI standard-mode 项目**，不是用一个根 nest-cli.json 管理全部后端的 Nest CLI monorepo。每个 Nest 应用保留自己的 nest-cli.json、package.json、tsconfig.json 和启动入口；仓库根由 pnpm 管理应用与包。两种 Nest 组织模式均受官方支持，目录中没有必须统领全部微服务的运行时“根应用”。

- `apps/`：目标可独立运行的应用；最终为 Web + 四个业务服务，目前先有职责 README。
- `packages/`：共享契约、设计令牌、纯 TS 模拟和客户端适配的职责占位；实现以真实复用为依据，不把服务内部实现放进来。
- `infra/`：Docker Compose、Nginx 与观测组件等运行配置。
- `scripts/`：开发、种子、备份和恢复等可重复操作；需要时再加入。
- `tests/`：跨应用的浏览器流程、契约和压测；模块单测贴近源码，服务集成测试放服务内部。
- `docs/`：产品范围、架构、目录规则、学习验收、技术决策和运行手册。

这是本项目的组织选择。Next 的特殊目录/文件名和 Nest Module 遵循框架规范，其余业务目录可以按需求调整。

## 2. 第一阶段将初始化的源码结构

```text
interview-study/
├─ apps/
│  ├─ web/                         Next.js 应用
│  │  ├─ src/
│  │  │  ├─ app/                   路由、布局、页面与加载/错误入口
│  │  │  ├─ features/              auth、questions、practice
│  │  │  ├─ components/            通用 UI 和应用布局
│  │  │  └─ lib/                   请求、Query 初始化等技术适配
│  │  ├─ public/
│  │  ├─ package.json
│  │  └─ .env.example              只有变量名和非敏感示例
│  └─ core-api/                    NestJS 核心后端
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ app.module.ts
│     │  ├─ config/                当前服务环境变量校验
│     │  ├─ database/              当前服务 Prisma Provider
│     │  └─ modules/               auth、users、questions、practice
│     ├─ prisma/                   schema、迁移、种子
│     ├─ test/                     当前服务的集成测试
│     ├─ package.json
│     ├─ nest-cli.json             当前 Nest 项目的 CLI 配置
│     ├─ tsconfig.json             当前项目 TypeScript 配置
│     └─ .env.example
├─ infra/
│  └─ compose/                    初期本地 PostgreSQL 等依赖
├─ docs/                          已有设计文档及本指南
├─ package.json                   根开发命令与工具版本
├─ pnpm-workspace.yaml            workspace 应用/包范围
├─ pnpm-lock.yaml                 安装时生成并提交
├─ .gitignore
└─ README.md                      安装、启动与当前阶段说明
```

上述树表示第一阶段源码目标，不表示所有文件已经存在。当前完整职责骨架还包含 studio-service、report-worker、ai-service 等 README；它们不因此成为已初始化应用。先做出一条可使用的业务流程，再生成相应源码。`reviews`、小组、预约等模块随需求提取；最初的简单复习规则可放在 practice 模块内。

## 3. 最终演进后的仓库总览

```text
interview-study/
├─ apps/
│  ├─ web/                         Next.js / React / 浏览器 Worker / PWA
│  ├─ core-api/                    NestJS：身份、题库、训练、计划与权限
│  ├─ studio-service/              NestJS：实时房间、消息、架构场景
│  ├─ report-worker/               NestJS：异步统计、报告、导出及状态 API
│  └─ ai-service/                  NestJS + Mastra：AI 教练与运行管理
├─ packages/                      职责 README 已建，代码按真实使用添加
│  ├─ contracts/                  跨服务事件、Socket 消息与任务协议
│  ├─ design-tokens/              平台中立的颜色、间距、字体与状态规范
│  ├─ simulation-core/            纯 TypeScript 的教学模拟引擎
│  └─ api-client/                 按需生成的客户端契约与调用代码
├─ infra/
│  ├─ compose/                    本地和部署环境的服务编排
│  ├─ nginx/                      代理、TLS、Socket 与流式响应配置
│  └─ observability/              观测组件配置
├─ scripts/
│  ├─ dev/                        开发辅助与环境检查
│  ├─ backup/                     各服务备份与清单
│  └─ restore/                    隔离恢复与核对
├─ tests/
│  ├─ e2e/                        Playwright 浏览器业务流程
│  ├─ contracts/                  跨服务契约兼容验证
│  └─ load/                       API / 任务等压测脚本
├─ docs/
│  ├─ product-blueprint.md
│  ├─ learning-matrix.md
│  ├─ worker-offline-agent.md
│  ├─ project-structure.md
│  ├─ bootstrap-guide.md          从职责骨架到可运行闭环的操作步骤
│  ├─ decisions/                  已确认边界与后续技术决策记录
│  └─ runbooks/                   后续部署、排障、恢复手册
├─ .github/workflows/             采用 GitHub 时的 CI/CD
├─ package.json
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ AGENTS.md                      项目协作与实现规则，供工具自动识别
└─ README.md
```

每个应用有自己的 package.json、构建配置、环境校验和部署入口；Nest 应用各自拥有 nest-cli.json，Web 使用 Next 配置。Dockerfile 在需要独立部署时放入对应应用。根目录管理 workspace 和共用命令，不把所有依赖都安装到根目录。

这些 package.json、框架配置、锁文件和 Dockerfile 均按初始化步骤产生；当前 README 占位不声明这些文件已经存在。Web/H5 是同一 Web 应用，未来 App、小程序、桌面框架待选，不预先创建未经选型的客户端目录。

先用 pnpm workspace 和明确脚本；需要构建缓存与任务依赖编排时再选择 Turborepo 等工具。

## 4. Web：路由与业务分开看

```text
apps/web/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                根布局
│  │  ├─ providers.tsx             Query / 主题等客户端 Provider
│  │  ├─ (public)/
│  │  │  └─ questions/             /questions 与题目详情
│  │  ├─ (auth)/
│  │  │  └─ login/page.tsx          /login
│  │  └─ (workspace)/
│  │     └─ app/                   实际 /app URL 段
│  │        ├─ layout.tsx          登录后应用布局
│  │        ├─ page.tsx            /app 工作台
│  │        ├─ practice/           /app/practice
│  │        ├─ rooms/              /app/rooms
│  │        ├─ lab/                /app/lab
│  │        ├─ offline/            /app/offline
│  │        └─ coach/              /app/coach
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ questions/
│  │  ├─ practice/
│  │  ├─ rooms/
│  │  ├─ lab/                      Three 场景适配、工具栏、编辑状态
│  │  ├─ offline/                  题包、IndexedDB、同步和冲突界面
│  │  └─ coach/                    流式对话、引用、计划确认
│  ├─ components/
│  │  ├─ ui/                       shadcn 基础组件
│  │  └─ layout/                   侧栏、导航、通用布局
│  ├─ lib/
│  │  ├─ http/                     浏览器 Axios 与服务端 fetch 分入口
│  │  └─ query/                    QueryClient 与 hydration 支持
│  ├─ workers/                     浏览器计算 Worker 入口
│  │  └─ simulation.worker.ts
│  ├─ service-worker/              Workbox / Service Worker 源码
│  │  └─ sw.ts
│  └─ instrumentation.ts           需要时加入服务端观测入口
├─ public/                         静态资产；构建后生成 sw.js
├─ scripts/                        本应用的 SW 清单与构建辅助
├─ package.json
└─ next.config.ts
```

圆括号 `(public)` / `(workspace)` 是路由分组，不出现在 URL；实际 `/app` 由内部名为 `app` 的普通目录产生。每条路由按需要加入 page.tsx、layout.tsx、loading.tsx、error.tsx，不给每一层机械创建全部特殊文件。

`app/` 负责页面入口、布局、服务端数据读取与组装，`features/` 组织可复用业务内容。简单、仅用于当前页面的组件可以与页面同目录，不要求每段 JSX 都经过一层转发。

一个业务目录可逐步长成：

```text
features/practice/
├─ components/                    答题编辑器、题干、自评表
├─ api/                           提交、草稿、历史请求与 Query 定义
├─ hooks/                         业务交互 Hook
├─ practice.types.ts              当前业务的局部类型
└─ answer-editor.test.tsx          有价值的组件行为测试
```

局部 React 状态够用时先保持局部。Zustand store 放在确实需要它的业务中，例如 lab/store；Query 返回的数据不复制到 store。不要先建一个全站 `stores/` 保存所有业务。

`public/sw.js` 是 Service Worker 构建产物，逻辑只编辑 `src/service-worker/sw.ts`；具体产出和缓存清单按锁定版本的构建方式实现。Web Worker 由前端构建入口加载，计算实现可调用 simulation-core。

多端扩展时把存储、会话凭据、网络、流式传输与平台能力作为适配点；不把 IndexedDB、Workbox 或 DOM 类型放进跨端纯模型。内容的稳定 ID、format/schema 版本、baseVersion 和 operationId 从 A 开始设计。离线队列与 CRDT 不提前实现；旧离线草稿的兼容是后续升级的必要验收。

## 5. Nest 后端：按业务模块聚合

```text
apps/core-api/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ config/
│  ├─ database/
│  │  └─ prisma.service.ts
│  ├─ modules/
│  │  ├─ auth/                    统一身份、独立设备会话与会话撤销
│  │  ├─ users/
│  │  ├─ workspaces/
│  │  ├─ questions/
│  │  ├─ practice/
│  │  │  ├─ dto/
│  │  │  ├─ practice.module.ts
│  │  │  ├─ practice.controller.ts  REST 命令与入口
│  │  │  ├─ practice.service.ts     业务规则与事务
│  │  │  └─ practice.service.spec.ts
│  │  ├─ reviews/
│  │  ├─ interviews/               预约与场次业务状态
│  │  ├─ dashboard/                GraphQL 聚合读取
│  │  └─ outbox/                   可靠事件发布
│  └─ common/                     少量全服务通用技术组件
│     ├─ filters/
│     └─ interceptors/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ test/integration/
├─ package.json
└─ Dockerfile
```

保持 `Controller → Service → 当前服务 PrismaService` 的清晰路径。查询复杂、数据源多或有实际隔离需求时，再提取 `practice.repository.ts`；不强制每个模块都有 Repository、接口、工厂和四层 DDD 目录。

GraphQL resolver 在业务需要时加入对应模块；REST 命令与 GraphQL 查询复用业务规则，不创建两份 Service。`common/` 只放少量通用技术处理，不放全部业务 Service、DTO 或权限规则。

GraphQL 用于组合查询、REST 用于当前业务命令、Socket.IO 用于房间实时通道、BullMQ 用于后台任务。后期一条内部调用可引入 gRPC，tRPC 保留为可选专项；三者不是进化替代关系，不为相同业务重复三套逻辑。内部 proto 只在该链路实施时加入 contracts；独立网关/BFF 仍待评估，当前是 Nginx 路由与 core-api 聚合。

studio-service 也按房间、消息、场景等业务组织；Mongo 文档定义、索引与数据演进脚本归它所有。report-worker 按报告、导出与任务组织，拥有自己的数据库、Prisma schema 与迁移。它们不会导入 core-api 的 PrismaService。

## 6. AI 服务：Nest 与 Mastra 在一个应用内

```text
apps/ai-service/
├─ src/
│  ├─ main.ts                     接口进程入口
│  ├─ worker.ts                   需要时增加的后台执行入口
│  ├─ app.module.ts
│  ├─ config/
│  ├─ modules/
│  │  ├─ runs/                    状态、预算、取消、确认与恢复
│  │  ├─ conversations/           会话访问与隔离
│  │  ├─ retrieval/               授权检索
│  │  └─ jobs/                    BullMQ 调度和执行入口
│  ├─ mastra/
│  │  ├─ mastra.provider.ts        Nest Provider 创建并注入 Mastra
│  │  ├─ agents/                  学习教练、面试与架构评审
│  │  ├─ tools/                   受限业务工具
│  │  ├─ workflows/               固定步骤与确认后继续
│  │  └─ memory/                  存储、会话和资源命名空间配置
│  ├─ clients/                    core-api / studio-service 内部 API 客户端
│  └─ database/                   AI 自有数据与运行存储适配
├─ prisma/                        AI 应用自有数据模型与迁移
├─ evals/                         固定样例、评分规则与回归执行
├─ test/integration/
├─ package.json
└─ Dockerfile
```

Mastra 作为内部库使用。API 和后台执行进程可复用同一应用镜像，属于同一 AI 业务服务。模型凭据、用户上下文、Memory 权限及 BullMQ/Workflow 恢复规则遵循 worker-offline-agent.md。

原理练习是可选短练习，文档阶段编号 `G0` 中的最后一位是数字零，与 Go 语言无关。整个正式方案以 TypeScript 为主。练习代码有真实产出时再放 `experiments/agent-basics/`，不作为长期维护的第二套正式 Agent 运行时。

## 7. 共享包与依赖规则

| 目录 | 允许放什么 | 保持的边界 |
| --- | --- | --- |
| packages/contracts | 有版本的事件、Socket 消息、任务载荷、必要的运行时协议校验 | 不导出 Prisma 模型、密码字段、Nest Service 或内部实体 |
| packages/design-tokens | 平台中立的颜色、间距、字体、圆角与状态规范；按需生成平台映射 | 源数据不依赖 Tailwind/DOM；统一设计语言，不承诺同一份 CSS 运行全部端 |
| packages/simulation-core | 纯 TS 教学模型、参数、算法、结果与确定性回放 | 不依赖 DOM、React、Three.js、Nest、数据库；浏览器 Worker 和 AI 工具可复用 |
| packages/api-client | 客户端所需的生成类型和调用代码 | 不依赖 Nest/Prisma；浏览器与服务端传输边界明确；业务 Hook 留在 Web feature |

依赖大体朝向：`应用 → 共享包`，共享包不反向依赖应用。不同应用通过接口和协议通信，不直接 import 另一个应用的 src。

业务模型和数据库客户端留在各自服务。共用一台数据库机器时仍划分凭据与权限，不能因为同仓库就跨服务写表或 JOIN。

只有一个 Web 时，shadcn 组件保留在 Web 的 components/ui；真正出现多个 DOM 应用复用时再提取 packages/ui。未来 React Native/Flutter 不假设能够直接复用 DOM 组件。

Web/H5 继续使用 Tailwind + shadcn；桌面 Web 运行时可复用程度需验证。App 在原生与 WebView 路线之间、小程序在适配框架之间尚未决定；复用接口、内容模型和令牌不等于复用完整 Next 页面或浏览器 3D 编辑器。

需要统一 TypeScript/ESLint 配置时再建立明确名称的配置包。不同应用保留合适的模块和构建配置，尤其 Next、Nest 与 Mastra 的 ESM 集成不能靠全仓库强行套一份 tsconfig 解决。

## 8. 从一个功能检查目录是否合适

以“提交回答”为例：

1. `web/src/app/.../practice` 组装页面。
2. `web/src/features/practice` 显示表单、处理提交和错误。
3. `core-api/src/modules/practice` 校验权限、输入和幂等，执行事务。
4. `core-api/prisma` 管理当前服务的数据结构与迁移。
5. 后续 `outbox → report-worker` 生成报告，AI 复盘通过 ai-service 的授权接口触发。

如果改一个业务规则时，大部分代码能集中在对应业务目录，边界通常是可理解的。先让一条流程工作，再按真正的复用、复杂查询和独立部署需求增加抽象。

## 9. 官方规范参考

- [pnpm workspace](https://pnpm.io/workspaces)：单仓库管理多个应用和包。
- [Next 项目结构](https://nextjs.org/docs/app/getting-started/project-structure)：app、public、src 与路由分组约定。
- [Nest Modules](https://docs.nestjs.com/modules)：按能力组织 Module 与依赖导出。
- [Nest CLI workspace 模式](https://docs.nestjs.com/cli/monorepo)：standard 与 Nest monorepo 两种代码组织方式。
- [Nest CLI 命令](https://docs.nestjs.com/cli/usages)、[CRUD generator](https://docs.nestjs.com/recipes/crud-generator)：创建项目、应用、模块与不同传输的资源骨架。
- [Nest 消息传输型微服务](https://docs.nestjs.com/microservices/basics)、[应用上下文](https://docs.nestjs.com/standalone-applications)：不同的启动方式。

目录中的业务命名、服务划分和交付顺序是本项目的设计选择，不是这些框架强制的标准。

## 10. CLI 创建方式与架构术语

### 两种工作区方式

| 方式 | 配置归属 | 创建方式 | 当前选择 |
| --- | --- | --- | --- |
| pnpm workspace + 多个 Nest standard 项目 | 每个应用自己的 package.json / nest-cli.json / tsconfig | 对各服务使用 nest new，再由 pnpm 统一管理 | 是，便于与 Next、纯 TS 包和不同构建配置共存 |
| Nest CLI monorepo | 根 nest-cli.json 的 projects 与共享 package.json，应用有各自 tsconfig.app.json | 先 nest new，再在标准项目中 nest generate app | 有效备选，本规划暂不转换 |

官方提供两种模式，并未要求微服务项目必须选择 Nest CLI monorepo。Nest CLI monorepo 中的默认项目是命令的默认目标，不是运行时管理其余服务的总控服务。

首次可以直接使用最新脚手架，创建后保留实际依赖清单和根锁文件。下面保留创建方式供参考；本仓库已完成生成和迁入，不应重复执行覆盖现有应用。新建其他应用时按 [搭建指南](./bootstrap-guide.md) 在临时目录生成、检查差异后迁入：

```sh
pnpm dlx @nestjs/cli@latest new core-api --directory .scaffold/core-api --package-manager pnpm --skip-git --skip-install
```

其他 Nest 服务按其阶段采用同样方式创建。统一通过仓库根安装 workspace 依赖，避免应用内部出现额外 Git 仓库和独立锁文件；模块系统、测试与观测配置以实际生成内容为准，遇到具体集成问题再调整并验证。

在已创建的 core-api 项目目录内，可继续使用标准生成器：

```sh
pnpm exec nest generate module modules/practice
pnpm exec nest generate service modules/practice
pnpm exec nest generate controller modules/practice
```

`nest generate app studio-service` 用于 Nest CLI monorepo 的应用生成，会涉及 workspace 结构和配置；不能把它当作在当前 pnpm 根目录随意添加一个独立 Nest package 的同义命令。`nest generate resource` 可生成不同传输方式的处理器骨架，不会自动完成服务拆分、消息设施、权限和数据库边界。

### 应用启动方式不决定业务服务数量

| 能力 | 可采用的 Nest 启动方式 |
| --- | --- |
| HTTP / GraphQL / Socket.IO / SSE API | NestFactory.create；按需要加载相应模块或 Gateway |
| TCP、NATS、Redis 等 Nest transport 消息处理 | NestFactory.createMicroservice；HTTP 与消息并存时按需使用 hybrid 应用 |
| 只消费 BullMQ 的执行进程 | NestFactory.createApplicationContext；需要状态 API 时另提供 HTTP 入口 |

架构上的微服务可以采用 HTTP，也可以是后台任务服务。Nest 文档里的 microservice 专门指其非 HTTP transport 应用；用 Redis 做缓存、Socket.IO adapter 或 BullMQ 存储，不等于已经采用 Nest Redis transporter。

### 聚合根、入口与根模块

- DDD 聚合根管理一个业务聚合的规则与事务一致性，例如学习计划与其计划项；当前尚未专门做战术 DDD 聚合建模，按业务复杂度再引入。
- 当前 Nginx 提供入口路由，core-api 的 GraphQL 组合工作台所需数据；尚未单独部署 API 聚合 BFF。查询聚合与业务写入职责分清，写入仍由数据所属服务负责。
- 当跨服务查询聚合显著增长或 Web / 移动客户端需求分化，再评估独立 BFF，而不是新增一个管理全部服务的全局聚合根。
- 每个 Nest 应用各自有 AppModule 等根模块；仓库根配置、Nest 根模块和 DDD 聚合根是不同概念。
