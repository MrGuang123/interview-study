# 当前状态

进度与文档最后核对：2026-10-25。当前电脑已完成 core-api 无扩展名导入与 CommonJS 输出的脚手架检查；其余应用的自动检查记录仍来自 2026-10-21 的旧电脑。真实数据库与业务验收仍待执行。

## 已建立

- 根目录唯一的协作约定 `AGENTS.md`，包含完整规则并供工具自动识别。
- pnpm workspace 根配置、工具版本基线、编辑规则与 Git 忽略规则。
- 五个目标应用的职责 README；四个共享包的职责 README。
- 运行配置、维护脚本、跨应用验证与运行手册的目录说明。
- 产品/学习设计、架构决定、目标代码结构与逐步搭建指南。
- 阶段 2 实施建议和 UI/交互文档已建立；用户已接受浅深色渐变方向。[UI-design](../UI-design/README.md) 保存全站 17 类页面的 34 张浅/深色设计板，每张含桌面与 H5，另有原始参考 2 图和关键状态板 4 图；均使用示例数据，不代表逐页用户验收。完整可点击原型与浏览器可访问性验收仍待完成。
- `packages/design-tokens/src/tokens.json` 已建立平台中立完整令牌，覆盖配色、渐变、尺寸、排版、圆角、阴影、层级、动效、布局和组件状态；尚无包清单、生成器或 CSS 输出，未接入 Web。
- PostgreSQL 手写学习第一课在旧电脑按用户反馈完成：用户已亲手创建 Compose、环境示例与本地配置，并确认 SQL 读写及 `down`/`up` 后数据保留正常。代理前次只读核对容器为 healthy；SQL 与重建验证由用户执行。
- core-api 的 Prisma 7 依赖清单与根锁文件、CLI 配置、零模型 schema、应用/迁移环境示例、生成目录忽略规则及校验/生成脚本已建立；用户已手写 PrismaService / DatabaseModule，应用模块和入口尚未装配它们，业务模型未建立。
- core-api 已按用户要求采用 CommonJS 输出与无扩展名相对导入；Prisma 生成器、入口、CLI 环境加载和 Vitest 配置同步调整，见 [模块格式决定](decisions/0002-core-api-extensionless-imports.md)。
- 换电脑/新会话的交接入口与新电脑开发手册；第二台电脑已完成本次 core-api 脚手架验证，数据库和其余应用需分别核对。

五个官方脚手架已迁入正式 `apps/`，旧电脑曾统一安装依赖。**2026-10-21 旧电脑的五个应用 lint、类型检查与生产构建通过，四个 Nest 应用默认单元测试和 E2E 通过；2026-10-25 当前电脑已单独复验 core-api。业务与浏览器交互尚未验证。**

## 实现状态

| 项目 | 目录与职责 | 脚手架/运行 | 业务/集成验收 |
| --- | --- | --- | --- |
| web | 已创建 | 旧电脑 lint、typegen、类型与构建通过；当前机未复验 | 浏览器交互/业务未验证；尚无测试脚本 |
| core-api | 已创建；CommonJS、Prisma 配置与未装配的 Provider | 当前机 lint、类型、构建、1 单测及 1 E2E 通过；开发/构建产物默认 HTTP 200 | 生成客户端与 Provider 可加载；尚未执行真实数据库连接 |
| studio-service | 已创建 | 旧电脑构建、lint、类型、1 单测及 1 E2E 通过；当前机未复验 | 仅验证过默认 HTTP 示例 |
| report-worker | 已创建 | 旧电脑构建、lint、类型、1 单测及 1 E2E 通过；当前机未复验 | 仅验证过默认 HTTP 示例 |
| ai-service | 已创建 | 旧电脑构建、lint、类型、1 单测及 1 E2E 通过；当前机未复验 | 仅验证过默认 HTTP 示例 |
| design-tokens | 已创建职责文档与完整 JSON 令牌源 | 未生成可构建包或 CSS | Web/多端消费未开始 |
| contracts / simulation-core / api-client | 已创建职责文档 | 未生成可构建包 | 未开始 |
| UI-design | 17 类页面浅深色桌面/H5 图稿、参考与状态板 | 静态概念设计，全部为示例数据 | 可点击链路、实际可访问性和业务联调未验收 |
| Compose / PostgreSQL | 已创建职责文档与开发配置 | 旧电脑 PostgreSQL 18.6 Alpine healthy；当前机 daemon 暂不能连接 | 旧电脑用户确认 SQL 读写、重建后保留通过；本机角色/权限待验收，应用集成未完成 |
| Nginx / 观测 | 已创建职责文档 | 无运行配置 | 未验证 |
| 备份 / 恢复 / CI / 跨应用测试 | 已创建职责文档 | 无执行配置 | 未验证 |

## 已核对与未执行

- 2026-10-25 本机使用 Node `24.22.1`、pnpm `11.22.0`、TypeScript `6.0.3`，完成 core-api CommonJS / 无扩展名导入调整。Prisma validate 和 generate 实际通过，客户端按 `cjs` 与空导入后缀重新生成；没有运行迁移或写入数据库。
- 同日 core-api lint、类型检查、生产构建、默认单元测试 `1/1` 和默认 E2E `1/1` 通过。E2E 首次被沙箱限制本地监听，允许监听后重跑通过；Vitest 工具配置改为 `.mts` 后无原来的 CommonJS/ESM 配置提示。
- 同日实际运行 `start:prod` 与 `start:dev`，均得到 HTTP `200` 与 `Hello World!`；检查 `require` 可加载生成 PrismaClient 和 PrismaService，并确认构建产物使用无扩展名 `require`。验证使用 `NODE_ENV=test` 关闭 Observe，没有连接数据库；已停止验证进程。
- PrismaService / DatabaseModule 已由用户手写，当前只统一了导入路径；`AppModule` 尚未引入数据库模块，`main.ts` 未加载应用 `.env` 或执行数据库查询。下一步继续 02B 第 8.2～10 节，不能将本次默认 HTTP 验证记为数据库集成通过。

以下 2026-10-23 的环境记录是当时结果，环境后来已补齐到可执行上述 core-api 检查：

- 2026-10-23 当前电脑只读核对：macOS arm64，Node 为 `v22.17.0`，低于项目要求的 `24.19.0`。读取旧全局 pnpm 包的 `package.json` 得到版本 `10.12.4`；执行 `pnpm --version` 时尝试按项目基线下载 `11.22.0`，因代理沙箱限制写入 `Library/pnpm` 失败。这是本次代理执行环境限制，不能据此判断用户系统权限异常，也未确认项目 pnpm 已可用。
- 同日当前机 Docker CLI 为 `28.4.0`、Compose 为 `2.39.4`，context 为 `desktop-linux`。代理在沙箱外做只读检查后仍不能连接 Docker daemon；本轮未启动 Docker / PostgreSQL，不能复用旧电脑 healthy 记录。
- 当前机 `node_modules`、`infra/compose/.env`、`apps/core-api/.env`、`apps/core-api/.env.migration` 与 Prisma 生成目录均缺失。没有读取或打印真实凭据；未安装依赖、生成客户端或执行应用/数据库验收。补齐步骤见 [新电脑开发手册](runbooks/new-machine-setup.md)。
- 当时代码包含 Prisma `7.10.1` 的 CLI/client/adapter 锁定依赖，以及 `pg`、`dotenv`；CLI 配置加载独立迁移环境，零模型生成器采用 ESM。根构建脚本策略已有 Prisma 批准项；当时尚无数据库 Provider，后续进展见上方 2026-10-25 记录。
- 用户说明旧电脑已进行到 Prisma 配置；02A 角色、真实密码登录和权限验收仍缺明确结果记录，不能仅凭提交名称或配置文件存在认定通过。当前机数据库状态需重新核对。
- 本次修正 02A 的密码验收方法：容器内使用 `postgres` 服务地址，并验证错误密码被拒绝、正确密码可登录，避免将 loopback trust 连接或 `-W` 提示误记为密码认证通过。仅更新教学文档，未执行本机认证验收。

以下为旧开发电脑的历史检查与用户反馈，保留日期和来源，不代表当前电脑已通过：

- 2026-10-22 全站静态设计交付已核对：17 类页面的 34 张浅深色桌面/H5 板、4 张关键状态板与 2 张原始参考存在；PNG 完整性、JSON、链接、108 个令牌引用、22 个主题绑定及配色独立复核通过，详见 [设计验证记录](../UI-design/validation-report.json)。未运行页面集成或浏览器验收。
- 旧电脑已核对 Node `v24.19.0`、pnpm `11.22.0`，据此创建初始工具配置。
- 已检查文档的本地链接、代码围栏、根 JSON 与 workspace 范围；本地文档引用均可解析。
- 已执行 `pnpm -r --include-workspace-root list --depth -1 --json`，根与五个应用均可识别；共享包仍无清单。
- 已检测到根 Git、依赖目录和单一根锁文件；五个应用安装正常。
- 用户已执行 Next/Nest CLI，并生成 `.scaffold/web`、`core-api`、`studio-service`、`report-worker`、`ai-service`。
- 迁入后逐文件比较，五个应用共 75 个应迁文件均存在且与源一致；随后仅规范包名并补充 Web 的 `.env.example` 忽略例外。未发现子工作区、子锁文件、嵌套 Git 或额外正式 AGENTS.md。
- Next 临时工作区中的依赖构建策略已保留在根配置，框架使用说明已整理进应用 README；`.scaffold/` 不参与工作区，首轮验证已完成，可以清理。旧电脑当时仍保留它，不需要换机复制。
- 四个 Nest 模板均为 ESM + Vitest，并加入 `@nestjs/observe`；清单声明 Nest 12.x、Observe 0.3.x，已检查配置。Observe 仍有凭据占位值，不能据此认定已关联云端监控。
- 已读取实际安装依赖：Next 16.4.2、React 19.3.0、Nest 12.2.0、Vitest 4.1.12、Observe 0.3.16；Web TypeScript 已修正为 5.9.3，后端为 6.0.3。
- 五个应用构建、lint、类型检查通过，四后端合计 4 个单测及 4 个 E2E 通过。Web 已先执行 `next typegen`；Web 没有测试脚本，浏览器交互未验证。
- 本次修正 Web TypeScript 版本及根锁文件、Next 的 `agentRules: false`，并在四个后端测试环境关闭 Observe；未关联监控账号。当前 SDK 会识别默认凭据占位并不发送遥测。
- 字体联网、pnpm 全局索引和测试端口曾受执行环境限制，按实际权限重跑后最终通过，没有把环境失败计为项目测试结果。
- 2026-10-22 代理只读核实 Docker context 为 `desktop-linux`，Compose 项目为 `interview-forge-dev`；`postgres` 服务使用 `postgres:18.6-alpine`，状态为 running、健康状态为 healthy，端口为 `127.0.0.1:5432 → 5432/tcp`，挂载一个命名卷。
- 同日用户执行第一课的 SQL 读写与容器 `down`/`up` 后数据保留验证，并反馈“一切正常”；按用户确认记录该课完成。代理未自动执行 SQL 或重建容器；命名卷保留不等于备份恢复通过。
- 2026-10-22 已提供 [手写学习 02A：数据库角色与权限](lesson-02-database-roles.md)，当时记录为等待用户执行/反馈；之后 Prisma 配置已提交，但仍无角色和结构权限验收结果可更新。
- 尚未接入 Prisma 运行 Provider 或真实模型调用；登录、权限、多端同步、数据库业务集成、性能、备份恢复与 AI 评测仍是待实现目标。

## 下一步

当前机 core-api 默认脚手架与模块格式已验证；数据库角色和密码/权限按 [02A](lesson-02-database-roles.md) 单独验收，已有对象先检查，不重复创建或删除卷。用户继续按 [02B](lesson-02b-prisma-connection.md) 第 8.2～10 节手写 AppModule 装配、入口环境加载/真实查询与 E2E Provider 替换，再完成实际数据库连接验收。换电脑或缺少环境时按 [恢复手册](runbooks/new-machine-setup.md) 准备；业务模型和迁移留到 02C。

同时依据 [全站图稿](../UI-design/README.md) 和完整令牌源，按 [主题指南](ui-theme-guide.md) 分步建立 Web 映射及首条链路组件；完整渐变/阴影/布局映射、交互与浏览器可访问性仍须验证，不再重复选择主题。[首次检查手册](runbooks/initial-verification.md) 中浏览器脚手架手动检查仍待执行，依赖升级单独验证。

App、桌面、小程序的具体实现框架，以及独立网关/BFF、协同编辑实现，仍按 [架构决定](decisions/0001-foundation-boundaries.md) 保持待评估。
