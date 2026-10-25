# 开发交接

最后核对：2026-10-25。用于新会话或换电脑接手；详细实现状态以 [状态表](status.md) 为准，架构取舍以 [基础架构决定](decisions/0001-foundation-boundaries.md) 为准。这里保存接手摘要，不复制完整聊天或所有设计文档。旧电脑的运行与验收记录不能作为当前电脑的结果。

## 项目与开发方式

项目是“面试工坊 / Interview Forge”：通过真实的面试学习业务练习 React、TypeScript、Node.js 以及测试、部署、排障、多端同步和 AI。语雀只是同一账号多端连续使用的体验参照，项目不是通用文档应用。

用户希望先搭建整体目录、明确每个应用的职责，再逐步实现。需要解释命令用途和预期结果，按可检查的小步骤推进；不要因目录已存在就认定相应业务已实现。

用户当前采用亲手写代码/配置的学习方式：代理每轮提供一个完整小任务的文件位置、内容、解释、命令和验收，用户写完后代理检查实际文件。目录随实现建立，不只建空文件夹，也不自动代写整套系统。文档维护和只读检查可继续；明确要求代写/修复时再执行对应代码修改。

用户已指出页面和主题设计应在业务页面开发之前，并接受浅深色渐变方向，后续可优化。本次按用户要求将设计扩展为 [全站 17 类页面图稿](../UI-design/README.md)，每类浅/深色各一张，每张含桌面与 H5，另有关键异常状态板。完整可点击原型与浏览器可访问性验收仍待完成；独立数据库验证可并行，不再反复选主题。

用户明确希望同时具备专业工具感与技术实验感，功能和样式有先进感，包含设计巧思及动画过渡。当前“实验式工作区”为参考布局，“专业工作台”可按场景借鉴，共用初版视觉规则；具体色值、排版、圆角和动效基线已记录在 [UI 文档](ui-and-interaction.md)。动效帮助切换、保存反馈、面板展开及焦点/上下文变化，并支持减少动效偏好。

会话内答题预览含相同题干、不同布局、专注/编辑预览切换及模拟保存。本次静态图稿与完整 [tokens.json](../packages/design-tokens/src/tokens.json) 已落盘；图稿均为示例数据，不等于逐页用户确认、真实持久化或业务 API。令牌包清单、生成器、CSS 输出和 Web 集成尚未建立。

根目录只维护一个官方识别的 `AGENTS.md`，不再创建 `agent.md`、`agend.md` 或应用级重复约定。

## 当前接手点

- 五个应用已迁入 `apps/`：`web`、`core-api`、`studio-service`、`report-worker`、`ai-service`。当前电脑已有 core-api 依赖和生成客户端；其余应用本轮未复验。
- 五个应用的业务仍处于脚手架阶段；core-api 增加了尚未装配的数据库 Provider。`design-tokens` 已有完整平台中立 JSON，但尚非可构建包；其余共享包和维护脚本主要只有职责 README。基础设施已增加 PostgreSQL 开发 Compose 配置。
- 2026-10-21 旧开发电脑已通过五个应用的 lint、类型检查和生产构建；四个 Nest 应用合计 4 个默认单元测试、4 个默认 E2E 通过。Web 尚无测试脚本，浏览器交互未验证；2026-10-22、2026-10-23 未重跑这些应用检查。
- 用户已手写 PostgreSQL Compose、环境示例与本地配置。2026-10-22 代理在旧电脑只读核实 `desktop-linux` context 中的 `interview-forge-dev` 项目：`postgres` 服务使用 `postgres:18.6-alpine`，running/healthy，仅映射 `127.0.0.1:5432`，挂载一个命名卷。
- 同日用户执行第一课 SQL 读写及容器 `down`/`up` 后数据保留验证，反馈“一切正常”；第一课按用户确认完成。代理未自动执行 SQL 或重建容器，未验证备份恢复。
- Prisma 7 依赖、单一根锁文件、`prisma.config.ts`、零模型 `schema.prisma`、两份环境示例、生成目录忽略规则和 `db:validate` / `db:generate` 已建立。用户已手写 PrismaService / DatabaseModule；`AppModule` 尚未导入数据库模块，`main.ts` 未加载应用 `.env` 或执行真实查询，E2E 仍检查默认 HTTP 示例。
- 用户明确要求相对导入省略扩展名；2026-10-25 已将 core-api 改为 CommonJS 输出，Prisma 生成器同步为 `cjs` 与空导入后缀，Vitest 工具配置使用 `.mts`。其他三个 Nest 应用保持 ESM。原因与边界见 [模块格式决定](decisions/0002-core-api-extensionless-imports.md)。
- 同日本机使用 Node `24.22.1`、pnpm `11.22.0`，通过 Prisma validate/generate、lint、类型检查、构建、1 个单测、1 个 E2E；开发和构建产物均返回默认 HTTP 200 / Hello World，CommonJS 可加载生成客户端与 PrismaService。验证关闭 Observe、未连接数据库，不能视为 02B 的真实数据库验收完成。
- 用户描述旧电脑已进行到 Prisma 配置；仓库仍缺少 02A 角色、密码登录与权限的明确验收结果，不据此认定通过。当前电脑的 Docker 数据卷和角色也不能从 Git 恢复，需要单独核对或重建。
- 2026-10-23 当前电脑只读检查：macOS arm64，Node 版本低于项目基线；Docker CLI / Compose 已有，`desktop-linux` daemon 暂不能连接。依赖、本地 Compose / core-api 环境文件与生成客户端均缺失；本轮未安装依赖、启动容器或执行应用/数据库验收。详细检查见 [状态表](status.md)，补齐顺序见 [新电脑开发手册](runbooks/new-machine-setup.md)。
- 未实现登录、权限、Prisma 运行集成/数据库业务集成、跨服务通信、实际 AI、多端同步或业务功能。Nginx、CI、备份恢复和完整观测也未配置运行。
- `.scaffold/` 是已完成迁移的临时生成目录，已忽略，不参与 workspace 或运行；不需要复制到另一台电脑。

新电脑必须重新安装并执行相应检查，不能将以上记录直接报告为本机通过。操作步骤见 [新电脑开发手册](runbooks/new-machine-setup.md)，验证命令见 [首次检查手册](runbooks/initial-verification.md)。

## 已确认、接手时容易误解的决定

| 事项 | 当前决定 |
| --- | --- |
| 工程组织 | pnpm workspace；四个 Nest 应用分别采用 CLI standard-mode，不改成根 Nest CLI monorepo |
| 启用顺序 | 先做 Web + core-api 的完整业务链路，其他服务按实际阶段启用 |
| 技术覆盖 | 用户希望充分练习技术，但以有业务意义、可验证的功能承载，不为了数量同时启用所有依赖 |
| 入口与聚合 | Nginx 为计划中的入口代理，core-api 承担需要的 GraphQL 查询聚合；独立网关/BFF 未决定 |
| 通信 | REST 命令/认证/上传、GraphQL 组合读取、Socket.IO 实时消息、BullMQ 后台任务；gRPC 后期选真实内部链路，tRPC 可选 |
| 数据归属 | 各服务拥有自己的数据，通过授权接口或事件协作，不共享 PrismaService 或跨服务直接操作表 |
| AI | TypeScript + NestJS + Mastra，默认同进程；文档中的 `G0` 是原理练习阶段，不是 Go 语言 |
| 同步 | 首版在线同步 + 本地草稿 + 冲突提示；完整离线和多人协同是分别演进的维度 |
| 多端界面 | 平台中立设计令牌可共享；Web 的 DOM、shadcn、Workbox 不保证原样用于所有端 |

详细服务所有权、演进代价和再评估条件见 [架构决定](decisions/0001-foundation-boundaries.md)。页面与业务范围见 [产品蓝图](product-blueprint.md)，技术对应的学习验收见 [学习矩阵](learning-matrix.md)。

## 工具与已完成修正

- 工具基线在根 `.node-version` 和 `package.json`，当前为 Node `24.19.0`、pnpm `11.22.0`。只维护根锁文件，换电脑使用 `pnpm install --frozen-lockfile`。
- 首次生成脚手架可以使用 `@latest`；已有仓库直接复现锁文件，不重新生成，也不默认升级依赖。
- Web 使用 Next、React、TypeScript、Tailwind；部分规划依赖尚未安装，以实际 `package.json` 为准。Web TypeScript 已调整为 `5.9.3`；类型检查前先执行 `next typegen`。
- 四个 Nest 模板最初选择 ESM + Vitest；2026-10-25 core-api 单独改为 CommonJS 与无扩展名相对导入，其余三个保留 ESM 和 `.js` 相对导入。已安装 Observe，测试环境关闭它；当前凭据仍为模板占位值，未关联云端监控，本地脚手架验证不要求开通账号。
- Next 配置 `agentRules: false`，配合本项目仅保留根 `AGENTS.md` 的约定。
- 根尚无 `dev`、`test` 等转发脚本。先读对应应用清单，再使用实际包名与已有命令。

## 下一步与待定事项

接手后先核对代码、当前分支和工作区改动，再按本次用户任务推进。当前推荐的开发顺序是：

1. 当前机 core-api 的模块格式与默认脚手架验证已通过；数据库角色/权限仍按 [02A](lesson-02-database-roles.md) 核对实际结果。换电脑或环境缺失时按 [新电脑开发手册](runbooks/new-machine-setup.md) 恢复，已有库/角色先检查，不重复创建或删除数据卷。
2. 按 [02B：core-api 接入 Prisma 7](lesson-02b-prisma-connection.md) 第 8.2～10 节继续手写应用模块装配、入口环境加载/真实查询与 E2E Provider 替换，再完成数据库运行验收。已写的 PrismaService / DatabaseModule 保留无扩展名导入；本轮没有代写后续数据库接入。现有依赖按锁文件恢复，02C 才安排首个业务模型、shadow 数据库和迁移。
3. 依据 [全站图稿](../UI-design/README.md)、[交互规范](../UI-design/interaction-spec.md) 和完整令牌源，按 [页面与主题指南](ui-theme-guide.md) 分步建立 Web 映射与首条链路组件。指南中的入门生成器只覆盖基础平面字段，完整渐变/阴影/布局映射尚未实现；旧示例临时编译不代表应用集成。后续分步接身份权限和页面联调；首次浏览器脚手架手动检查仍待执行。
4. 随业务补测试和部署，再启用其他服务；全站静态图稿已有，业务实现仍分阶段推进。

阶段 2 已整理为 [实施建议清单](stage-2-first-slice.md)，已修正为设计先行，一步一验收。清单中的模型、接口与认证路线尚未落代码，不代表已经完成选型或集成验证。

App 的 React Native/Capacitor/Flutter 路线、小程序框架、桌面的 Electron/Tauri、独立网关/BFF，以及具体协同编辑方案都未最终选定。不要把候选方案当成已接受的实现要求。

## 交接维护

完成一个有意义的阶段或准备换电脑时，更新实际变化的状态、重要决定和下一步；详细验证留在对应运行手册。将源代码、文档和锁文件一同提交并推送后，另一台电脑才会收到这些上下文。凭据、本机 Codex 配置和会话记录不作为项目依赖提交。
