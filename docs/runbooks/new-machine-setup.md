# 在另一台电脑继续开发

Git 同步源代码、协作约定和项目文档，不会同步工具安装、真实环境文件、生成客户端、Docker 数据卷或数据库角色。使用 [AGENTS.md](../../AGENTS.md)、[交接说明](../handoff.md) 和 [状态表](../status.md) 恢复项目上下文，无需复制全部聊天。

2026-10-23 接手点：Prisma 7 的依赖清单、schema、CLI 配置和生成脚本已提交；Nest 数据库 Provider 与真实连接尚未实现。本文补充当前阶段换电脑需要的 PostgreSQL 与 Prisma 恢复步骤，旧电脑的通过记录不代表本机通过。

## 1. 在当前电脑保存并上传

先在仓库根执行：

```sh
git status --short
git diff
```

确认应用代码、根锁文件、配置及项目文档都已保存；逐项审查后，选择应纳入版本控制的文件提交，再推送到你自己的 GitHub 仓库。新建且尚未跟踪的文件也要检查内容，`git diff` 默认不会展示它们。本手册不代表已经执行提交或推送。

需要同步的内容包括根 `AGENTS.md`、`docs/`、各应用源码和配置、`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`。不复制 `node_modules/`、`.next/`、`dist/` 或 `.scaffold/`，也不要将聊天导出、凭据、真实环境变量、数据库转储加入仓库。

## 2. 获取同一份代码

另一台电脑需要 Git 和访问仓库的权限。首次获取时，将下面的 `YOUR_REPOSITORY_URL` 替换成你的仓库地址：

```sh
git clone YOUR_REPOSITORY_URL interview-study
cd interview-study
git status --short
git branch --show-current
```

确认位于你要继续开发的分支。已有本地仓库时先检查工作区；有未提交改动就先保存处理，随后切换到目标分支并执行：

```sh
git pull --ff-only
```

如果提示无法快进，先检查本地与远端提交差异，不要用强制覆盖或重置丢弃改动。

## 3. 安装相同工具与依赖

当前工具基线是 Node `24.19.0`、pnpm `11.22.0`，分别见根 `.node-version` 和 `package.json`；将来以仓库中的实际配置为准。通过你使用的 Node 安装器或版本管理器准备对应 Node，再准备对应 pnpm。若本机尚未安装 pnpm，可以在 Node 可用后执行：

```sh
npm install --global pnpm@11.22.0
node --version
pnpm --version
```

当前 Mac 已有 nvm，但检查时使用的是 Node `22.17.0`。在本机终端从当前仓库执行：

```sh
cd /Users/ytg/Documents/main-study/interview-study
source "$HOME/.nvm/nvm.sh"
nvm install "$(cat .node-version)"
nvm use "$(cat .node-version)"
npm install --global pnpm@11.22.0
node --version
pnpm --version
```

预期分别为 `v24.19.0` 与 `11.22.0`。nvm 下不同 Node 版本的全局工具分别安装，因此先切换 Node，再安装 pnpm；不用 `sudo`。本项目使用 `.node-version`，这里显式传入文件内容，不假设 nvm 会自动读取它。新开终端继续本项目时也先确认版本。

在仓库根安装：

```sh
pnpm install --frozen-lockfile
```

这里复用已提交的依赖清单和锁文件，不重新运行 `create-next-app@latest` 或 Nest 生成器。依赖安装失败时先查具体错误；不要通过删除锁文件或升级全部依赖来绕过。

锁文件已经包含 Prisma `7.10.1` 及对应 adapter、pg、dotenv，不需要再次 `add`、全局安装 Prisma 或升级到最新版本。根 workspace 也已有 Prisma 构建脚本许可，不默认重复执行 `approve-builds`。

继续数据库课程还需要下一节的环境恢复；只检查现有默认 HTTP 示例并不验证数据库。目前无需申请模型密钥或开通 Observe 云端监控。

## 4. 恢复当前 PostgreSQL / Prisma 学习环境

### 4.1 恢复本地文件

以下命令从仓库根执行。三份真实配置不入 Git，换电脑后缺失是正常现象：

```sh
cp -n infra/compose/.env.example infra/compose/.env
cp -n apps/core-api/.env.example apps/core-api/.env
cp -n apps/core-api/.env.migration.example apps/core-api/.env.migration
```

`-n` 避免覆盖已有配置。在编辑器里填写本机凭据，文件内容分别如下；密码字段需由你在本机替换，不使用示例文本作为真实密码。

`infra/compose/.env`：

```dotenv
POSTGRES_DB=interview_core
POSTGRES_USER=forge_bootstrap
POSTGRES_PASSWORD=
POSTGRES_PORT=5432
```

先为 `POSTGRES_PASSWORD` 填写非空的本地管理密码。此文件用于 Docker 初始化；它不会自动创建下面两个角色。

`apps/core-api/.env`：

```dotenv
PORT=3001
DATABASE_URL="postgresql://forge_app:replace_with_url_encoded_app_password@127.0.0.1:5432/interview_core"
```

`apps/core-api/.env.migration`：

```dotenv
MIGRATION_DATABASE_URL="postgresql://forge_migrator:replace_with_url_encoded_migrator_password@127.0.0.1:5432/interview_core?schema=core"
```

后两份的密码分别对应下一步设置的应用角色和迁移角色；密码中的特殊字符要 URL 编码，例如 `@` 写成 `%40`、`#` 写成 `%23`。双引号不代替编码；不要把真实密码贴到聊天或在线编码网站。Nest 使用应用账号，Prisma CLI 使用迁移账号。

### 4.2 启动 Docker 与 PostgreSQL

当前 Mac 已安装 Docker Desktop、Docker CLI 与 Compose，但 2026-10-23 检查时 Docker daemon 无法连接。先从应用程序打开 Docker，或执行：

```sh
open -a Docker
```

等待界面显示引擎就绪，然后在仓库根执行：

```sh
docker info --format '{{.ServerVersion}}'
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml up -d postgres
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml ps
```

预期 `postgres` 为 running/healthy，端口仅绑定 `127.0.0.1:5432`。镜像与挂载沿用已提交的 `postgres:18.6-alpine` 配置，不需要在 macOS 额外安装 PostgreSQL；SQL 客户端使用容器内的 psql。

若本机是新的数据卷，Compose 只初始化 `forge_bootstrap` 与 `interview_core`，不会带来旧电脑的数据、角色或 `core` schema。若已有数据卷，先检查其中对象；修改 `.env` 不会重新设置既有数据库密码。不要以删除卷来解决登录问题。需要旧电脑数据时，应另走备份/恢复，Git 拉取不属于数据库恢复。[官方镜像初始化规则](https://hub.docker.com/_/postgres)

### 4.3 在本机重新建立并核对角色

进入下列目录，按 [02A 第 2～6 节](../lesson-02-database-roles.md) 执行管理账号登录、角色创建、交互设置密码、schema 授权和实际权限验收：

```sh
cd /Users/ytg/Documents/main-study/interview-study/infra/compose
```

三个账号分工仍为：`forge_bootstrap` 初始化管理；`forge_migrator` 拥有 `core` 并负责迁移；`forge_app` 负责应用运行，没有 `core` 建表权限。角色若已存在，先检查，不重复创建或删除。

本机验收目标：两个连接角色均为错误密码被拒绝、正确密码可登录；应用角色 `USAGE=true`、`CREATE=false`，实际建表被拒绝；迁移角色可创建并删除课程指定的权限探针表。将设置的两个密码分别填入前面的本地 URL。

容器内验收使用 02A 已更正的 `-h postgres` 服务地址；不要把 `-h 127.0.0.1 -W` 的密码提示当作认证通过证据。官方镜像的容器内 loopback 可能使用 trust；`-W` 只负责提示输入。后续 Nest URL 仍使用本机映射地址 `127.0.0.1:5432`，两处地址的连接位置不同。[官方镜像认证说明](https://hub.docker.com/_/postgres)

### 4.4 重新生成客户端

返回仓库根执行：

```sh
cd /Users/ytg/Documents/main-study/interview-study
pnpm --filter @interview-forge/core-api run db:validate
pnpm --filter @interview-forge/core-api run db:generate
git check-ignore apps/core-api/.env apps/core-api/.env.migration apps/core-api/src/generated/prisma/client.ts
git status --short
```

预期校验通过，生成 `apps/core-api/src/generated/prisma/client.ts`，`git check-ignore` 列出三条路径。生成物不提交，因此即使旧电脑生成过，新电脑仍需生成。

`generate` 本身不需要连接数据库，但本项目配置调用 `env('MIGRATION_DATABASE_URL')`，所以必须先有本地 `.env.migration`。校验和生成通过不代表真实连接或授权验收通过，也不会创建业务表。[Prisma 7 配置与环境加载](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)

到这里完成环境恢复小任务。2026-10-25 起 core-api 采用 CommonJS 输出与无扩展名相对导入，Vitest 配置使用 `.mts`；按仓库实际配置恢复，不把旧的 ESM 生成器或显式 `.ts` 导入混入当前代码。原因见 [模块格式决定](../decisions/0002-core-api-extensionless-imports.md)。

之后对照 [02B 第 5.3～6 节](../lesson-02b-prisma-connection.md) 核对模块配置和 scripts，再继续第 7～10 节的 `PrismaService`、`DatabaseModule`、入口加载/真实查询和 E2E Provider 替换。当前默认 `main.ts` 尚未加载应用 `.env` 或装配数据库模块；写好文件本身不会让它自动生效。

## 5. 在新电脑重新验证

按 [首次检查手册](initial-verification.md) 执行代码检查、类型检查、测试和构建。旧电脑的通过记录只能作为参考，不能直接代表新电脑验证通过。

手动启动 Web：

```sh
pnpm --filter @interview-forge/web run dev
```

另开终端启动 core-api。macOS/Linux：

```sh
PORT=3001 pnpm --filter @interview-forge/core-api run start:dev
```

Windows PowerShell：

```powershell
$env:PORT = '3001'
pnpm --filter @interview-forge/core-api run start:dev
```

访问 `http://localhost:3000` 查看 Next 默认页面，访问 `http://localhost:3001` 应得到 `Hello World!`。这只验证脚手架，不能据此认定登录、数据库或前后端业务已连通。

完成 02B 的 Nest 接入后，按该课第 11～14 节重新检查和启动：需要实际得到 `forge_app / interview_core / schema_usage=true / schema_create=false`，并验证构建产物启动和迁移账号连接。首个业务模型、专用 shadow 数据库、迁移 SQL 审查与逐表授权留到 02C，不提前执行 `db push`、`migrate reset` 或删除卷。

## 6. 给另一台电脑的 Codex 开场提示

在 Codex 中打开这个仓库，创建会话后可以发送：

```text
这是“面试工坊 / Interview Forge”，我从另一台电脑接着开发。
请先读取根 AGENTS.md、docs/handoff.md、docs/status.md，以及当前任务相关的架构决定和应用 README。
核对实际代码、当前 Git 分支、工作区改动与文档是否一致，简要复述已完成内容、尚未实现内容和下一步。
不要重新生成已有架构或覆盖脚手架，也不要把旧电脑的验证记录当成本机已通过。
后续按仓库约定继续；本次要做的任务是：【填写这次具体任务】。
```

文档能保存项目目标、已确认决定、当前状态和后续入口；临时讨论或新的要求仍需在新会话中说明。没有必要上传完整聊天来恢复开发。

## 7. 两台电脑轮换的最简流程

结束开发前：检查改动，更新确实变化的状态/交接信息，提交并推送。

换电脑开始前：检查本机工作区，拉取同一分支的最新提交；依赖清单或锁文件发生变化时，重新执行 `pnpm install --frozen-lockfile`，再运行本次改动需要的检查。

尽量避免两台电脑在尚未同步时同时修改同一分支。发生分歧时先比较并合并，不用强制推送覆盖另一台电脑的成果；日常轮换不强制增加 PR 或多分支流程。
