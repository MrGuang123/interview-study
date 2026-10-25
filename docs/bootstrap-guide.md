# 面试工坊：从目录骨架到可运行架构

> 当前状态：五个应用已安装依赖并通过首次 lint、类型和构建检查；四个 Nest 的默认单元/E2E 测试通过。当前参考第 3.6 节复核及手动启动，不要重复生成或覆盖正式代码。
> 本文说明搭建顺序；应用职责以各目录 README 为准，源码组织见 [project-structure.md](./project-structure.md)，实际进度见 [status.md](./status.md)。协作时先阅读根 [AGENTS.md](../AGENTS.md)。

## 1. 先区分三种完成度

| 完成度 | 本阶段应得到什么 | 不能据此宣称什么 |
| --- | --- | --- |
| 文档骨架 | 目标应用、共享包、基础设施和测试目录各有职责与边界 | 框架已经初始化、服务可以启动 |
| 可运行技术骨架 | 官方脚手架、真实配置、构建、健康检查和一条端到端调用 | 业务功能或跨端同步已经完成 |
| 业务架构 | 登录、回答、草稿、权限、可靠任务等按阶段可验收 | 所有预留技术已经接入 |

可以先看到完整目录，但不必第一天安装所有依赖、启动所有服务。目录 README 是能力归属的约定，空实现不是能力证明。暂不创建没有内容的 Controller、Module、Dockerfile、工作流和成功退出的假检查脚本。

目标应用为 `web`、`core-api`、`studio-service`、`report-worker`、`ai-service`。独立 API 网关/BFF 尚未确定；先由 Nginx 路由、core-api 提供必要聚合，不预设第六个应用。移动 App、小程序和桌面端先保留客户端边界，选型确认后才创建实际项目。

## 2. 阶段 0：检查工具与仓库约束

### 2.1 首次直接使用最新脚手架

首次创建使用 `create-next-app@latest` 和 `@nestjs/cli@latest`，不需要设置版本变量，也不需要自己填写版本号。`@latest` 表示使用包维护者当前标记为 latest 的发布版本。下面第 3 节已经给出可以直接执行的完整命令。

先在仓库根确认基本工具可用：

```sh
node --version
pnpm --version
git --version
```

命令打印版本号就说明工具可用；若提示 command not found，再安装对应工具。Docker 在接入数据库时才需要，届时执行 `docker --version` 和 `docker compose version` 检查即可。

本机已读取到 Node `24.19.0`、pnpm `11.22.0`，根版本文件记录了这一基线。核对本指南时，Next 要求 Node 至少 `20.9`，Nest CLI 在 Node 24 系列要求至少 `24.15`；本机满足这两项要求，可以先生成应用，不需要先完成整套依赖的兼容性调查。[Next 安装要求](https://nextjs.org/docs/app/getting-started/installation)、[Nest 安装要求](https://docs.nestjs.com/first-steps)

创建、安装并验证启动之后，保留应用的 `package.json` 和根 `pnpm-lock.yaml`，用它们记录项目实际采用的依赖。后续 `pnpm install` 根据这些文件安装，不会因为创建时用了 `@latest` 就每次自动升级全部依赖；升级依赖是后续单独进行的操作。

不要求新手先手工挑选框架版本。只有出现明确的 Node、依赖或模块格式错误时，再根据错误处理；Mastra/Prisma 的集成兼容在真正接入时验证，不能仅因脚手架启动成功就视为全部通过。

以下是可选的排查命令，不是开始搭建前必须完成的步骤：

```sh
pnpm view create-next-app@latest version
pnpm view @nestjs/cli@latest version
pnpm dlx create-next-app@latest --help
pnpm dlx @nestjs/cli@latest new --help
```

`pnpm view` 查看包仓库中的版本信息；`--help` 查看 CLI 参数。它们会访问网络，`pnpm dlx` 还会下载并运行 CLI。本文按核对时的官方参数编写；若未来参数变化，根据该版本的帮助修正命令。基础边界见 [0001-foundation-boundaries.md](./decisions/0001-foundation-boundaries.md)。

### 2.2 建立 workspace，但不制造伪工作区包

根 `pnpm-workspace.yaml` 管理：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

allowBuilds:
  sharp: false
  unrs-resolver: false
```

只有包含 `package.json` 的目录才成为实际 workspace 项目。只有 README 的目标应用和共享包先保持文档状态。后续由仓库根执行安装，提交单一 `pnpm-lock.yaml`；不在每个应用维护独立锁文件。

这里的 `allowBuilds` 来自本次 Next 模板，两个 `false` 表示禁用对应依赖的安装构建脚本，已合并到根配置。它们不表示已经安装或运行过依赖；其他依赖若出现构建提示，再按实际情况处理。[pnpm 11 配置说明](https://pnpm.io/blog/releases/11.0)

实际包统一使用 `@interview-forge/<目录名>`，例如 `@interview-forge/web`、`@interview-forge/core-api`、`@interview-forge/contracts`。根 `package.json` 保持 `private: true`。根脚本只转发已经存在且能运行的应用命令，不提前写 `dev:all` 假装全部服务可启动。

验收：基本工具可用，能说明每个目标应用负责什么、哪些项目还没有 `package.json`；未生成或安装的依赖不虚填版本号。

### 2.3 建立唯一的 Git 仓库

当前已检测到根 `.git`，无需再次初始化。下面命令仅供尚未建立仓库的全新目录使用：

```sh
git init
git status --short
```

检查 `.gitignore` 生效、没有凭据或生成依赖后，再组织提交。应用生成器关闭 Git 初始化，避免各应用形成嵌套仓库。

## 3. 阶段 1：安全生成官方框架骨架

### 3.1 先在临时目录生成，保护已有职责文档

本仓库的 `apps/web` 等目录已经含有人工维护的 README。不要直接对它们运行 `create-next-app` 或 `nest new`，也不要删掉 README 让脚手架通过。

在仓库根建立不属于 workspace 匹配范围的临时目录；以下所有相对路径均以仓库根为工作目录：

```sh
mkdir -p .scaffold
```

`.scaffold/` 加入根 `.gitignore`。选择从未使用过的临时输出目录；如果 `.scaffold/web` 已存在，先检查旧内容，不强制覆盖。每次只生成一个应用并审查其产物。

### 3.2 生成 Next.js Web/H5

```sh
pnpm dlx create-next-app@latest .scaffold/web --typescript --tailwind --eslint --app --src-dir --use-pnpm --skip-install --disable-git --import-alias '@/*'
```

选择 App Router、TypeScript、Tailwind 和 `src/`。对于脚手架新增的缓存、编译器、Agent 指引或反馈选项，逐项阅读；不要仅因为默认开启就当作已决策。当前 CLI 可能生成自己的 `AGENTS.md`，不得直接覆盖仓库协作规则；有价值的框架注意事项可以审查后合并到应用级说明。反馈与观测外部集成也应明确选择。[create-next-app 官方参数](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

先看脚手架的 `package.json`、Next 配置、TypeScript、lint、CSS 入口和生成文件。不要套用旧教程的配置文件名覆盖当前产物。Next Server Components 与客户端依赖的边界先保留；核心业务规则不放进只能由 Web 调用的 Server Actions。

### 3.3 生成独立 Nest standard 项目

先生成核心应用：

```sh
pnpm dlx @nestjs/cli@latest new core-api --directory .scaffold/core-api --package-manager pnpm --skip-git --skip-install
```

需要统一生成其余技术骨架时，再分别执行：

```sh
pnpm dlx @nestjs/cli@latest new studio-service --directory .scaffold/studio-service --package-manager pnpm --skip-git --skip-install
pnpm dlx @nestjs/cli@latest new report-worker --directory .scaffold/report-worker --package-manager pnpm --skip-git --skip-install
pnpm dlx @nestjs/cli@latest new ai-service --directory .scaffold/ai-service --package-manager pnpm --skip-git --skip-install
```

每个 Nest 应用独立保留 `package.json`、`nest-cli.json`、`tsconfig.json` 和入口。不要在仓库根运行 `nest generate app` 把当前组织隐式转换为 Nest CLI monorepo。`nest new` 创建的是 standard 项目；命令和选项见 [Nest CLI 官方说明](https://docs.nestjs.com/cli/usages)。

交互提示中的 ESM/CommonJS、测试工具、lint 和观测 SDK 随 CLI 版本可能变化。先保留各应用适合的生成配置并验证启动，Mastra/Prisma 接入时再处理实际模块兼容，不强制全仓库使用同一份 `tsconfig`。观测工具按本项目方案接入，若本轮不采用脚手架提供的集成，在交互中明确跳过；当前 CLI 支持时可使用其对应关闭选项。

最初生成的四个 Nest 模板均选择了 **ESM + Vitest，并加入 Observe**，无需重新创建。2026-10-25 用户要求无扩展名导入，core-api 已单独改为 CommonJS 输出，详见 [模块格式决定](decisions/0002-core-api-extensionless-imports.md)；其余三个 Nest 应用保持 ESM。当前已安装 Nest 12.2.0，产品业务仍待实现，验证结果见 [状态表](status.md)。

- core-api 的相对导入省略扩展名，并同步使用 CommonJS 包声明和 Prisma 生成器；其余 ESM 应用保留脚手架生成的 `.js` 相对导入。不要只修改导入字符串而忽略应用自己的编译与运行配置。
- Vitest 是当前 Nest ESM 模板的默认测试工具，保留生成配置；遇到旧教程的 Jest mock API 时改用对应 Vitest API。[Nest CLI 说明](https://docs.nestjs.com/cli/overview)
- Observe 是可选的托管监控集成。当前模板仍引用环境凭据或 `YOUR_APP_KEY` / `YOUR_APP_SECRET` 占位值，选 Yes 不等于已经完成云端关联。需要监控时再配置真实凭据及其加载方式，或明确停用集成；不要把占位配置当成有效认证，也不在安装时自动替用户关联账户。
- 暂不同时增加第二套后端自动追踪 SDK；与后续 OpenTelemetry、Sentry 的范围统一评估。Observe 与 OpenTelemetry 当前并非同一条可互换的追踪管线。[Observe SDK](https://docs.nestjs.com/observability/sdk)、[与 OpenTelemetry 的取舍](https://docs.nestjs.com/observability/opentelemetry)

### 3.4 审核后搬入目标目录

以 Web 为例，先预览复制内容；以下 `rsync` 不删除目标文件，并排除人工文档、嵌套 Git、依赖目录、子工作区配置和独立锁文件。Next 模板本次生成了自己的 `pnpm-workspace.yaml`；其中构建策略已审查并合并到根，文件本身不复制进 `apps/web`，避免形成额外工作区边界：

```sh
rsync -avn --exclude README.md --exclude AGENTS.md --exclude .git --exclude node_modules --exclude pnpm-workspace.yaml --exclude pnpm-lock.yaml .scaffold/web/ apps/web/
```

确认预览后才执行复制：

```sh
rsync -av --exclude README.md --exclude AGENTS.md --exclude .git --exclude node_modules --exclude pnpm-workspace.yaml --exclude pnpm-lock.yaml .scaffold/web/ apps/web/
```

其他应用采用相同流程，例如 core-api：

```sh
rsync -avn --exclude README.md --exclude AGENTS.md --exclude .git --exclude node_modules --exclude pnpm-workspace.yaml --exclude pnpm-lock.yaml .scaffold/core-api/ apps/core-api/
rsync -av --exclude README.md --exclude AGENTS.md --exclude .git --exclude node_modules --exclude pnpm-workspace.yaml --exclude pnpm-lock.yaml .scaffold/core-api/ apps/core-api/
```

两条命令之间必须检查预览，不把它们作为无人审查的覆盖脚本。预留目录已经开始开发后，不能重复用此流程覆盖源码，应逐文件合并。将脚手架 README 中需要的运行说明合并进原有职责 README，再核对没有丢失职责和边界。

随后调整实际 `package.json` 的名称和 `private`，检查 `.gitignore`、端口、模块与构建配置。审查临时产物后再清理临时目录；不要把 `.scaffold` 残留当成可部署应用。

本次迁入已检查：五个应用共 75 个应迁文件与源一致，职责 README 保留；包名已统一，Web 的 `.env.example` / `.env.*.example` 已补充 Git 忽略例外。后续不要重新 rsync 覆盖这些规范化修改。

`.scaffold/` 只是临时生成目录，已被 Git 忽略，也不匹配 workspace 的应用/包范围。确认源内容已迁入、被排除文件的有效设置和说明已合并后即可清理；建议在首次安装、构建和测试之后删除，便于初期对照。清理后仍可正常运行 `apps/`，无需保留临时副本。

### 3.5 从根安装并验证真实命令

仅在文件和依赖审查完成后，从仓库根执行：

```sh
pnpm install
pnpm --filter @interview-forge/web run
pnpm --filter @interview-forge/core-api run
```

后两条先列出实际存在的脚本。如果已经按约定修改包名，且脚手架确实提供对应脚本，再分别启动：

```sh
pnpm --filter @interview-forge/web run dev
pnpm --filter @interview-forge/core-api run start:dev
```

在不同终端运行两个应用；先配置 core-api 使用独立端口，避免与 Web 默认端口冲突。构建、lint、类型检查和测试以实际生成的脚本为准，再把它们规范为仓库共同接口。不使用 `--if-present` 静默跳过本应存在的必需检查。

本地端口建议如下，尚未写入应用配置：

| 应用 | 开发端口 |
| --- | --- |
| web | 3000 |
| core-api | 3001 |
| studio-service | 3002 |
| report-worker 的内部 HTTP API | 3003 |
| ai-service | 3004 |

纯后台进程不需要监听 HTTP 端口。Nest 端口通过经过校验的配置或实际启动环境传入；创建 `.env` 文件不会自动让尚未配置环境加载的应用读取它。容器内部端口与主机映射可以另行设计，不必机械复制本地表格。

首次安装生成并提交根锁文件；后续 CI 使用 `pnpm install --frozen-lockfile`。若包管理器对依赖构建脚本有审批机制，阅读所需脚本后按锁定版本的官方流程处理，不为安装方便一键放开所有脚本。

如果想查看实际安装了什么版本，在安装成功后执行以下命令即可，不需要回头替换创建命令中的 `@latest`：

```sh
pnpm --filter @interview-forge/web list next react react-dom --depth 0
pnpm --filter @interview-forge/core-api list @nestjs/core @nestjs/common --depth 0
```

验收：Web/H5 页面可打开，核心 Nest 可独立启动与构建；其余应用分别标注“仅职责文档”“脚手架可运行”或“已有业务”，不把统一安装误认为全部接入完成。

### 3.6 安装完成后怎么检查

按 [首次检查手册](./runbooks/initial-verification.md) 执行依赖查看、lint、类型检查、四后端测试和生产构建，再在两个终端启动 Web/core-api 手动访问。这里已有实际检查记录，不需要凭安装日志判断是否正确。

本次五个应用自动检查均已通过。Web 首次类型检查前需要 `next typegen`，TypeScript 已从 5.0.2 修正为 5.9.3；四个后端测试环境关闭 Observe。Web 尚无测试脚本，不能将它计作测试通过。

## 4. 阶段 2：先完成一条真实链路

本节是阶段目标摘要。具体设计前置、用户故事、数据与 API 建议、逐步实施和验收见 [阶段 2 实施清单](stage-2-first-slice.md)；它是产品 A 阶段的第一部分，不等于完整个人训练闭环已经完成。

1. 先按 [UI 与交互设计任务书](ui-and-interaction.md) 明确用户流程、整站导航骨架和首批四页线框，比较并选择视觉主题，形成首批语义令牌/组件规范与关键状态原型；再细化数据和 API 契约。
2. 在 `infra/compose/` 添加真实的开发 PostgreSQL 配置，固定镜像版本、卷、健康检查和开发凭据示例；独立连接与持久化验证可以和设计并行。
3. core-api 接入自有 Prisma 模型/生成配置、迁移和配置校验。CLI 与运行依赖依据已选大版本配套，生成、迁移命令按锁定版本确认；先审查迁移 SQL，禁止随意重置已有数据。
4. 配置结构化日志、请求标识、统一错误格式及健康/就绪检查；日志不得输出会话凭据和完整私人内容。
5. 按已设计的主题与交互实现页面，Web 通过明确的请求适配调用 core-api；建立同源开发入口或严格的开发跨域规则，正常和异常状态与原型一致。
6. 完成“登录 → 查看一道题 → 写回答 → 保存 → 刷新可恢复”的纵向流程。
7. 为身份与对象权限、重复提交、事务等关键行为增加有意义的验证，并检查页面是否符合设计；页面能打开不是这些行为已经正确。

首批 Nest 模块可在应用内使用官方生成器创建；只在存在真实功能时生成：

```sh
pnpm --filter @interview-forge/core-api exec nest generate module modules/practice
pnpm --filter @interview-forge/core-api exec nest generate service modules/practice
pnpm --filter @interview-forge/core-api exec nest generate controller modules/practice
```

保留 `Controller/Resolver → Service → 当前服务数据访问` 的直接关系，复杂度增长后再提取 Repository。此时 studio、report、AI 可以继续只保留文档或未启用的独立脚手架，不要求为首页请求经过全部服务。

验收：一份回答真正进入 PostgreSQL，换设备登录能读取；未授权账号无法读取或修改它。构建和已声明检查通过，部署步骤可复现。

## 5. 阶段 3：扩展契约、设计令牌和多端基础

### 5.1 共享包从真实消费者开始

- `contracts`：版本化事件、任务、实时消息和必要的运行时校验；不导出 ORM 模型或服务内部实体。
- `design-tokens`：平台无关的色彩、间距、字体、圆角与状态语义，先映射 Web CSS 变量/Tailwind；以后再生成原生和小程序主题。
- `simulation-core`：真正开发实验模型时创建纯 TS 包，不依赖 DOM、Three、Nest 或数据库。
- `api-client`：出现多客户端或生成客户端的实际需求后创建；不提前制作统一所有平台能力的万能 SDK。

首批视觉规范和语义令牌在阶段 2 随页面设计形成；Web 实际消费时就建立必要的中立源与映射，不必等到本阶段。这里继续完善共享包、复用和后续平台输出。

只有形成实际包时才添加它的 `package.json`、导出、构建和验证配置。使用 `workspace:*` 声明本仓库依赖；应用依赖共享包，共享包不得依赖应用，应用之间不导入彼此的 `src`。[pnpm workspace 约定](https://pnpm.io/workspaces)

### 5.2 账号与同步先稳定

由 core-api 管理统一用户、已验证登录身份、独立设备会话和工作空间成员；账号相同不代表各设备共用同一凭据。数据接口由服务端检查对象权限。

第一版明确支持：联网跨设备读取、云端草稿、本地草稿恢复、操作 ID 去重、基础版本检查和冲突提示。内容保存稳定 ID、格式版本与明确状态；草稿与正式提交分开。

完整离线能力和多人协同是独立维度，不机械排成同一条升级链。后续离线创建/删除需要操作队列、删除状态、重连恢复和冲突规则；多人编辑可在具体编辑模块引入 CRDT，并制定旧客户端和旧草稿的迁移办法，不将 CRDT 用于合并权限、评分或正式提交事务。

Web/H5 使用同一 Next 应用。移动 App、小程序、桌面端选型前先用能力矩阵明确登录、存储、网络、通知、流式输出与编辑范围；共享数据和设计规范，不承诺 shadcn/DOM/Workbox 能直接在全部端运行。桌面端还需验证加载线上 Next 与打包本地资源的区别。

验收：两台设备使用同一账号交替修改；离线草稿恢复不会覆盖更新版本；退出其中一个会话不影响其他会话；切换账号不会暴露前一账号的本地内容。

## 6. 阶段 4：逐个启用目标服务与专项能力

| 应用/能力 | 启用顺序与边界 | 必须验证 |
| --- | --- | --- |
| GraphQL 工作台 | core-api 组合查询，复用业务 Service；REST 保留命令与上传等入口 | 对象权限、分页上限、N+1 与错误行为 |
| studio-service | 实时房间/消息，再增加场景模型；Mongo 自有索引和演进记录，Redis 仅作相应临时状态/分发 | 持久化后确认、去重、断线补拉、权限变更 |
| 实验室 | 共享模型、Three 渲染、Web Worker 计算分开 | 确定性回放、取消、过期结果丢弃、资源释放与简化视图 |
| report-worker | 有报告状态/数据所有权后作为独立服务；纯消费进程可用 Nest 应用上下文 | Outbox、幂等、重投、超时，答案不受报告失败影响 |
| ai-service | Nest + Mastra 的 TypeScript 应用；先只读，再授权工具和确认后写入 | 上下文隔离、预算、取消、幂等、固定样例评测与重启恢复 |
| gRPC | 服务拆分稳定后选择一条内部链路，例如 AI 读取练习上下文 | proto 兼容、身份、deadline、错误映射与追踪 |
| tRPC | 可选的 TypeScript 工具或比较实验，不作为全仓库必装主干 | 明确收益，避免重复实现业务规则 |

AI 原理短练习的 `G0` 是阶段编号，末位为数字零，与 Go 语言无关。Mastra 通过 Nest Provider 集成，不默认额外启动另一套公开 AI 服务器。BullMQ 调度与 Mastra Workflow 各自的重试/恢复范围需要明确。

HTTP/GraphQL/Socket.IO 的 Nest 应用不需要为了叫“微服务”一律改用 `createMicroservice()`。不同应用有独立网络调用、数据所有权和部署边界，才实际验证了服务拆分；每个服务使用自己的数据库权限，禁止跨服务直接 JOIN 或写表。

验收：一次只启用一项并完成异常验证；README 记录真实启动方式、依赖、协议和当前状态。代码生成器创建出 Module，不代表该边界已经可独立运行。

## 7. 阶段 5：补齐可维护、可恢复的部署

安全、日志、测试和可重复部署从第一个业务阶段开始。这里负责跨服务联通和完整演练：

1. 应用各自添加经过验证的 Dockerfile，采用锁定版本、正确构建上下文和必要健康检查；先验证 workspace 包在镜像中可构建，再优化镜像。
2. Compose 仅编排当前实际服务；Nginx 配置同源入口、TLS、请求限制、Socket Upgrade 和流式响应，分别测试普通请求、重连与长输出。
3. 统一请求/任务关联标识、客户端类型和应用版本；接入错误上报、受控 source map、追踪与基础指标，验证一次前端到数据库或任务的定位流程。
4. CI 执行真实构建、类型/lint 检查和重要测试；必需检查缺失或失败时不能显示通过。
5. 为实际数据源编写备份、校验、异地保存和隔离恢复操作；记录版本、时间边界、对象附件和待处理事件，并完成恢复后的对账。
6. 将内容版本恢复、应用镜像回退、数据库恢复分开演练。旧镜像需与当前 schema 兼容，卷不是备份，不能把恢复生产库当作普通网页按钮。

验收：在隔离环境制造一次故障并定位、恢复；保存测量结果与限制。没有执行恢复演练之前，只能写“已配置备份流程”，不能写“数据恢复已验证”。

## 8. 每增加一个项目，更新什么

对应 README 持续回答：职责、非职责、当前完成度、入口/协议、依赖与数据所有权、环境变量、运行/验证方式、已知限制。新增命令、变量和接口后同步更新，删除已失效的说明。

技术决策记录说明问题、候选方案、最终选择和代价；运行手册记录真实发布、排障与恢复步骤。涉及协议、权限和格式变更时，补充旧客户端与旧本地数据如何继续使用或迁移。

当前可以先完成整仓目录与职责文档。下一次真正搭建时，从“确认工具可用 → 使用 @latest 在临时目录生成 Web/core-api → 审核合并 → 根安装并保存锁文件 → 独立启动构建 → 一条真实业务链路”开始，不需要先填满所有预留服务。
