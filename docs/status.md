# 当前状态

进度与文档最后核对：2026-10-28。用户确认 03A「存活与数据库就绪检查」已完成，health 模块、AppModule 接入与 4 个健康 HTTP 测试已提交；代理未重跑真实数据库停机/恢复。下一课 03B 的完整手写内容已提供，并在临时副本通过检查；请求上下文、中间件与过滤器尚未写入实际应用。其余应用仍沿用历史检查记录。

## 已建立

- 根目录唯一的协作约定 `AGENTS.md`，包含完整规则并供工具自动识别。
- pnpm workspace 根配置、工具版本基线、编辑规则与 Git 忽略规则。
- 五个目标应用的职责 README；四个共享包的职责 README。
- 运行配置、维护脚本、跨应用验证与运行手册的目录说明。
- 产品/学习设计、架构决定、目标代码结构与逐步搭建指南。
- 阶段 2 实施建议和 UI/交互文档已建立；用户已接受浅深色渐变方向。[UI-design](../UI-design/README.md) 保存全站 17 类页面的 34 张浅/深色设计板，每张含桌面与 H5，另有原始参考 2 图和关键状态板 4 图；均使用示例数据，不代表逐页用户验收。完整可点击原型与浏览器可访问性验收仍待完成。
- `packages/design-tokens/src/tokens.json` 已建立平台中立完整令牌，覆盖配色、渐变、尺寸、排版、圆角、阴影、层级、动效、布局和组件状态；尚无包清单、生成器或 CSS 输出，未接入 Web。
- PostgreSQL 手写学习第一课在旧电脑按用户反馈完成：用户已亲手创建 Compose、环境示例与本地配置，并确认 SQL 读写及 `down`/`up` 后数据保留正常。代理前次只读核对容器为 healthy；SQL 与重建验证由用户执行。
- core-api 的 Prisma 7 依赖、CLI 配置与运行 Provider 已建立，AppModule 已装配数据库模块，入口已加载应用配置并执行真实账号/权限查询，默认 E2E 已用替身覆盖数据库 Provider。02B、[02C](lesson-02c-first-migration.md) 按用户反馈完成；User 模型、首迁移与真实读写/回滚验收脚本已存在，本轮未由代理重验数据库。
- [03A：存活与数据库就绪检查](lesson-03a-health-checks.md) 按用户反馈完成，源码与测试已提交；[03B：请求标识与错误响应](lesson-03b-request-errors.md) 已提供完整文件内容、解释、命令和验收，待用户手写。教程临时目录校验与实际应用完成状态分开记录。
- core-api 已按用户要求采用 CommonJS 输出与无扩展名相对导入。03A 提交中用户采用显式 `module: commonjs`，不声明 package type/moduleResolution；TS 6.0.3 实际默认解析为 Bundler。Prisma 生成器仍为 cjs，Vitest 工具配置仍为 .mts，见 [模块格式决定更新](decisions/0002-core-api-extensionless-imports.md)。
- 换电脑/新会话的交接入口与新电脑开发手册；第二台电脑已完成本次 core-api 脚手架验证，数据库和其余应用需分别核对。

五个官方脚手架已迁入正式 `apps/`，旧电脑曾统一安装依赖。**2026-10-21 旧电脑的五个应用 lint、类型检查与生产构建通过，四个 Nest 应用默认单元测试和 E2E 通过；2026-10-25 当前电脑已单独复验 core-api。业务与浏览器交互尚未验证。**

## 实现状态

| 项目 | 目录与职责 | 脚手架/运行 | 业务/集成验收 |
| --- | --- | --- | --- |
| web | 已创建 | 旧电脑 lint、typegen、类型与构建通过；当前机未复验 | 浏览器交互/业务未验证；尚无测试脚本 |
| core-api | CommonJS、Prisma、User/迁移/验收脚本与 health 已手写 | 现有 1 个单测、5 个 HTTP E2E；10-28 新教程临时副本通过 lint、类型、构建、1 单测、12 HTTP E2E，非实际应用已实现 03B | 02B、02C、03A 按用户反馈完成；10-28 未复验真实停库/恢复；03B 待用户手写 |
| studio-service | 已创建 | 旧电脑构建、lint、类型、1 单测及 1 E2E 通过；当前机未复验 | 仅验证过默认 HTTP 示例 |
| report-worker | 已创建 | 旧电脑构建、lint、类型、1 单测及 1 E2E 通过；当前机未复验 | 仅验证过默认 HTTP 示例 |
| ai-service | 已创建 | 旧电脑构建、lint、类型、1 单测及 1 E2E 通过；当前机未复验 | 仅验证过默认 HTTP 示例 |
| design-tokens | 已创建职责文档与完整 JSON 令牌源 | 未生成可构建包或 CSS | Web/多端消费未开始 |
| contracts / simulation-core / api-client | 已创建职责文档 | 未生成可构建包 | 未开始 |
| UI-design | 17 类页面浅深色桌面/H5 图稿、参考与状态板 | 静态概念设计，全部为示例数据 | 可点击链路、实际可访问性和业务联调未验收 |
| Compose / PostgreSQL | 已创建职责文档与开发配置 | 历史检查和环境变化见下；10-28 未复查容器 | 用户确认 02B、02C、03A 完成；真实连接、表权限及停库恢复按课程反馈记录，代理本轮未重验；备份恢复未验证 |
| Nginx / 观测 | 已创建职责文档 | 无运行配置 | 未验证 |
| 备份 / 恢复 / CI / 跨应用测试 | 已创建职责文档 | 无执行配置 | 未验证 |

## 已核对与未执行

- 2026-10-28 用户确认 03A 完成。当前提交 `a499bf7` 包含 3 个 health 文件、AppModule 接入与 4 个健康 HTTP E2E；开始检查时 `master` 工作区干净。按用户完成反馈记录，未自动连接数据库、停库或恢复容器。
- 本轮提供 [03B](lesson-03b-request-errors.md) 的 5 个完整手写文件，包含服务器请求 ID、JSON 完成日志、受控 HTTP 错误和健康 503 兼容。临时副本原样提取教程代码，使用 Node 24.19.0 / pnpm 11.22.0 及现有依赖，通过 lint、类型、构建、1 个默认单测与 12 个 HTTP E2E；测试允许本机监听，Prisma 为替身，新增 7 个用例覆盖隐私、错误、非法 JSON 和并发隔离。Node 直接 require 临时编译后的模块也通过，未启动真实数据库业务链路，不记为仓库已实现 03B。
- 已按实际提交同步模块说明：当前 core-api 使用 `module: commonjs`，未声明 package type/moduleResolution；TS 6.0.3 有效默认解析为 Bundler。没有修改用户源码、运行配置、依赖或迁移，也不把旧 NodeNext 决定当成当前文件内容。
- 2026-10-27 用户明确确认 02C 已完成。当前分支为 `master`，检查开始时工作区干净；实际首迁移的主键约束末尾已有逗号，User 模型、逐表 GRANT、`verify-user-model.cjs` 及相应 package 脚本存在。按用户反馈记录本课完成；代理没有执行数据库查询、迁移、停库、依赖安装或应用源码修改，不将文件检查写成运行验收。
- 同日提供 [03A](lesson-03a-health-checks.md)：存活/数据库就绪接口、模块装配、HTTP 行为测试及真实停库恢复步骤；后续课程再建立请求标识、错误契约、输入校验与身份会话。health 模块与测试仍待用户手写。
- 03A 教程的 5 段 TypeScript 在临时应用副本中原样校验，使用当前安装依赖通过 lint、类型检查、构建、1 个默认单测和 5 个 HTTP 测试。HTTP 测试首次因沙箱本机监听限制出现 EPERM，允许监听后通过；数据库使用替身，未复验真实停机/恢复。临时副本结果不计为仓库 health 模块已实现。
- 2026-10-26 用户明确反馈“本课完成”，按用户确认记录 02B 完成；代理核对 AppModule、入口查询、关闭钩子及 E2E 替身均已落代码。本轮 Node `24.19.0`，通过 lint、类型检查、默认单测 `1/1` 与构建；E2E 在监听 `127.0.0.1` 时被代理沙箱以 EPERM 拒绝，未扩大权限重跑，不能写本轮 E2E 已通过。数据库执行项未由代理重验，详情见 [本轮记录](runbooks/2026-10-26-core-api-02b-check.md)。
- 同日提供 [02C：首个业务模型、迁移与逐表授权](lesson-02c-first-migration.md)，含专用 shadow 库、User 资料模型、SQL 审查与回滚验收；没有代写练习源码或执行这些数据库操作。
- 随后用户手写了 User 模型及迁移 `20261026092106_create_users`，报告首次 deploy 以 P3018 / SQLSTATE 42601 失败。代理当时只读确认主键约束末尾缺逗号，文件有 BEGIN/COMMIT；提供了 [无残留检查与恢复步骤](runbooks/2026-10-26-first-migration-p3018.md)，未代为修正 SQL、查询数据库或执行 resolve/deploy。后续完成反馈见上方 2026-10-27 记录。

以下为 2026-10-25 的历史检查，当时完整数据库模块尚未装配：

- 2026-10-25 本机使用 Node `24.22.1`、pnpm `11.22.0`、TypeScript `6.0.3`，完成 core-api CommonJS / 无扩展名导入调整。Prisma validate 和 generate 实际通过，客户端按 `cjs` 与空导入后缀重新生成；没有运行迁移或写入数据库。
- 同日 core-api lint、类型检查、生产构建、默认单元测试 `1/1` 和默认 E2E `1/1` 通过。E2E 首次被沙箱限制本地监听，允许监听后重跑通过；Vitest 工具配置改为 `.mts` 后无原来的 CommonJS/ESM 配置提示。
- 同日实际运行 `start:prod` 与 `start:dev`，均得到 HTTP `200` 与 `Hello World!`；检查 `require` 可加载生成 PrismaClient 和 PrismaService，并确认构建产物使用无扩展名 `require`。验证使用 `NODE_ENV=test` 关闭 Observe，没有连接数据库；已停止验证进程。
- 当时 PrismaService / DatabaseModule 已由用户手写，只统一了导入路径；AppModule 和入口尚未完成数据库装配。该历史默认 HTTP 验证不代表数据库集成通过；后续完成反馈见上方 10-26 记录。

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

02B、02C、03A 按用户反馈完成。下一步由用户按 [03B 教程](lesson-03b-request-errors.md) 手写请求上下文、中间件、异常过滤器、模块接入和 HTTP 测试，再关联一组真实 404 响应与请求完成日志。已有首迁移作为历史保留，不重复生成或修改；换电脑或缺少环境时按 [恢复手册](runbooks/new-machine-setup.md) 准备。

同时依据 [全站图稿](../UI-design/README.md) 和完整令牌源，按 [主题指南](ui-theme-guide.md) 分步建立 Web 映射及首条链路组件；完整渐变/阴影/布局映射、交互与浏览器可访问性仍须验证，不再重复选择主题。[首次检查手册](runbooks/initial-verification.md) 中浏览器脚手架手动检查仍待执行，依赖升级单独验证。

App、桌面、小程序的具体实现框架，以及独立网关/BFF、协同编辑实现，仍按 [架构决定](decisions/0001-foundation-boundaries.md) 保持待评估。
