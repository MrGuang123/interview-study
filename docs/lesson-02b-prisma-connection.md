# 手写学习 02B：core-api 接入 Prisma 7

初稿：2026-10-22；导入写法更新：2026-10-25。状态：**core-api 已采用 CommonJS 输出与无扩展名相对导入；用户已开始手写 `src/database/`，完整 Nest 数据库接入与本机数据库验收仍待完成**。本文包含完整教学步骤，不应将尚未执行的步骤视为集成通过记录。

换电脑先按 [新电脑开发手册](runbooks/new-machine-setup.md) 恢复工具、依赖、本地环境文件和 PostgreSQL 角色；不必重做已提交的依赖添加或覆盖现有配置。本课采用源码相对导入省略扩展名、编译输出 CommonJS 的方式，先完成第 5.1、5.3 节的生成器与模块配置，再按第 6 节校验/生成客户端、补齐 scripts，最后从第 7 节继续手写 Nest 接入。

2026-10-23 更正：根据此前用户执行输出及旧电脑 Prisma 7.10.1 CLI 源码核对记录，客户端生成命令修正为 `prisma generate`；该版本默认允许无模型生成。这是历史核对记录，当前电脑仍须按实际生成与运行结果验收。

本课的目标是亲手跑通：

```text
本机 Nest core-api
  → Prisma Client
  → PostgreSQL 驱动适配器 / pg
  → 127.0.0.1:5432
  → Docker 中的 interview_core
```

应用使用 `forge_app`；迁移工具使用 `forge_migrator`。本课完成生成配置、Nest 接入、真实连接与权限查询。首个业务模型、迁移 SQL、shadow 数据库和逐表授权安排在 02C。

## 1. 开始前先核对上一课

先完成 [02A：数据库账号与权限](lesson-02-database-roles.md) 中的四项验收：

| 验收 | 预期 |
| --- | --- |
| 两个账号分别通过 TCP 和密码登录 | 错误密码被拒绝，正确密码成功 |
| forge_app 使用 core schema | USAGE 为 true |
| forge_app 在 core 建表 | CREATE 为 false，实际建表被拒绝 |
| forge_migrator 创建、删除指定的 permission_probe | 都成功 |

旧机账号与权限的完整验收尚无记录；新机数据库对象和密码也不会随 Git 恢复，因此本机须重新核对这些结果。若失败，先按 02A 排查；不要用管理账号替换应用账号。

以下命令除特别说明外，**全部从仓库根目录执行**：

```sh
cd /Users/ytg/Documents/main-study/interview-study
```

检查工具与容器：

```sh
node --version
pnpm --version
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml ps
```

本仓库当前基线为 Node `24.19.0`、pnpm `11.22.0`；PostgreSQL 应为 running/healthy。若容器尚未启动，沿用第一课已有配置启动：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml up -d postgres
```

容器内 psql 成功与本机 Node 能通过映射端口连接，是两个不同检查。本课补上后者。

## 2. 理解本课采用的版本与文件分工

本课使用 **Prisma ORM 7**。截至本次查阅，官方将 Prisma 8 标为 RC，且其 CLI 和使用方式已有变化。因此安装命令明确写 `@7`，安装后保存实际精确版本，并由根锁文件复现。[官方版本状态](https://www.prisma.io/docs/orm/release-status)

| 项目 | 本课职责 |
| --- | --- |
| prisma | 开发工具：检查 schema、生成客户端，后续执行迁移 |
| @prisma/client | Prisma 7 生成客户端使用的运行库 |
| @prisma/adapter-pg | 让 Prisma 使用 PostgreSQL 的 JavaScript 驱动 |
| pg | PostgreSQL 驱动，负责连接与 SQL 通信 |
| dotenv | 按明确入口把本地环境文件加载到进程环境 |
| prisma/schema.prisma | 声明数据库种类和客户端生成方式；下一课加入业务模型 |
| prisma.config.ts | Prisma CLI 的 schema 路径和迁移连接 |
| package.json / tsconfig.json | 声明 CommonJS 包，使用 NodeNext 按 Node 规则解析无扩展名导入 |
| src/database/ | Nest 的数据库 Provider 与模块 |

这里有两个不同的 schema 概念：`schema.prisma` 是 Prisma 配置文件；PostgreSQL 的 `core` 是数据库内的命名空间。

core-api 当前采用 CommonJS 输出，源码仍使用 TypeScript 的 `import` / `export` 语法，相对路径统一省略扩展名，例如 `./app.service`。TypeScript 的 NodeNext 模式结合本应用 `package.json` 中的 `type: commonjs`，将这些源码编译为 CommonJS，由 Node 解析无扩展名的 `require` 路径。Prisma 生成客户端采用相同模块格式，并放进 `src` 参与构建。其他 Nest 应用继续保留各自配置。[TypeScript Node 模块模式](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext)、[Prisma 7 生成器说明](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)

## 3. 安装依赖

2026-10-23：这些依赖与根锁文件已提交。换电脑只在根执行 `pnpm install --frozen-lockfile`，跳过本节的 `add`；下列命令保留用于解释首次安装过程。

在仓库根依次执行：

```sh
pnpm --filter @interview-forge/core-api add --save-exact @prisma/client@7 @prisma/adapter-pg@7 pg dotenv
pnpm --filter @interview-forge/core-api add --save-dev --save-exact prisma@7 @types/pg
```

理解参数：

- `--filter` 把依赖加到实际使用它的 core-api。
- `--save-dev` 将 CLI 和类型声明放到开发依赖。
- `--save-exact` 将本次解析出的具体版本写入清单，无需手填版本占位符。
- workspace 仍只维护根 `pnpm-lock.yaml`，不要在应用内创建第二个锁文件。

检查安装结果：

```sh
pnpm --filter @interview-forge/core-api list prisma @prisma/client @prisma/adapter-pg pg dotenv @types/pg --depth 0
pnpm --filter @interview-forge/core-api exec prisma --version
```

Prisma 的 CLI、client 和 adapter 都应属于 7.x。若解析到了其他大版本，先检查实际清单，不继续混用教程。

如果 pnpm 提示 Prisma 相关依赖的构建脚本等待批准，在根执行：

```sh
pnpm approve-builds
```

只选择本次提示中的 Prisma 包，例如 `@prisma/engines`、`prisma`、`@prisma/client`，以实际候选为准；其余按已有策略保留。检查根 `pnpm-workspace.yaml` 的变化，现有 `sharp: false`、`unrs-resolver: false` 应保留。若没有等待批准的包，跳过这条命令即可。[pnpm 构建脚本批准说明](https://pnpm.io/cli/approve-builds)

## 4. 手写环境文件

本课分开保存两类凭据：Nest 只加载 `.env`；CLI 配置只加载 `.env.migration`。不要将迁移密码放到应用的 `.env` 中。

### 4.1 可提交的应用环境示例

新建 `apps/core-api/.env.example`，完整内容：

```dotenv
PORT=3001
DATABASE_URL="postgresql://forge_app:replace_with_url_encoded_app_password@127.0.0.1:5432/interview_core"
```

### 4.2 可提交的迁移环境示例

新建 `apps/core-api/.env.migration.example`，完整内容：

```dotenv
MIGRATION_DATABASE_URL="postgresql://forge_migrator:replace_with_url_encoded_migrator_password@127.0.0.1:5432/interview_core?schema=core"
```

### 4.3 只存在本机的真实配置

若尚无对应本地文件，可以执行：

```sh
cp -n apps/core-api/.env.example apps/core-api/.env
cp -n apps/core-api/.env.migration.example apps/core-api/.env.migration
```

`-n` 避免覆盖已有文件。如果已有配置，在编辑器里保留原有项，补充本课所需变量。

在编辑器里将两个本地文件的示例密码替换为 02A 设置的对应密码。示例文件始终保留非敏感内容，不把本地真实配置复制回示例。

URL 格式是 `协议://账号:密码@主机:端口/数据库`。密码里的特殊字符需要 URL 编码，例如示例密码 `demo@pass#1` 在 URL 密码段写成 `demo%40pass%231`；常见字符 `@`、`#`、`%`、`/`、`?` 分别为 `%40`、`%23`、`%25`、`%2F`、`%3F`。双引号用于环境文件解析，不能代替 URL 编码。不要把真实密码贴进聊天、日志或在线编码网站。[Prisma 连接 URL 说明](https://www.prisma.io/docs/orm/v7/reference/connection-urls)

本机 Nest 连接 Docker 的映射端口，所以这里使用 `127.0.0.1`。如果你此前改过端口或数据库名，本文连接 URL、后面的数据库名断言与预期结果需要一起对应修改。

### 4.4 忽略生成客户端

在根 `.gitignore` 末尾追加一行：

```gitignore
/apps/core-api/src/generated/prisma/
```

现有规则已忽略 `.env`、`.env.*`，同时允许环境示例提交，无需重复增加。生成客户端由 schema 和锁定依赖重建，不需要手写或提交。

## 5. 手写 Prisma schema 与 CLI 配置

`schema.prisma` 可以先由 `prisma init` 创建模板，也可以直接手写。对于本课连接已有 PostgreSQL 的方式，初始化需要的文件内容可以手动提供；没有必须依靠 init 才能完成的本地注册步骤。[Prisma 7 init 生成文件说明](https://www.prisma.io/docs/cli/v7/init#generated-files)

下面对照 init 的主要文件职责，检查本课是否有遗漏：

| init 的起始文件 | 本课对应步骤 |
| --- | --- |
| prisma/schema.prisma | 第 5.1 节手写数据库种类与生成器配置 |
| CLI 配置文件 | 第 5.2 节手写 prisma.config.ts，并使用迁移连接 |
| .env | 第 4 节分别配置应用与迁移环境文件，以及非敏感示例 |
| .gitignore | 第 4.4 节复用根规则并补充生成目录 |

只写 schema 文件确实不足以完成 Nest 接入，所以本课还提供了依赖、环境加载、适配器、Provider 和模块装配。`init` 提供的默认模板同样需要按本项目修改这些内容。

2026-10-23 的旧电脑源码核对记录：该版 init 将 CLI 配置模板命名为 `prisma7.config.ts`，加载器也兼容本文使用的 `prisma.config.ts`；两者同时存在时新名称优先。本课保持单份 `prisma.config.ts` 即可。init 还可能安装开发辅助的 Agent skills，这些不是 Nest 运行和客户端生成的必需配置。当前电脑未重新验证这项 CLI 行为。

还要区分 `init` 与 `generate`：前者准备开发者维护的初始配置；后者读取 schema，生成程序使用的 Prisma Client。配置可以手写，客户端仍按第 6 节运行生成命令，不手写生成目录。

### 5.1 schema.prisma

新建 `apps/core-api/prisma/schema.prisma`，完整内容：

```prisma
generator client {
  provider               = "prisma-client"
  output                 = "../src/generated/prisma"
  moduleFormat           = "cjs"
  generatedFileExtension = "ts"
  importFileExtension    = ""
}

datasource db {
  provider = "postgresql"
}
```

逐项理解：

- `provider = "prisma-client"` 使用 Prisma 7 的 TypeScript 客户端生成器。
- `output` 相对于本文件，所以结果位于 `apps/core-api/src/generated/prisma`。
- `moduleFormat = "cjs"` 与当前 core-api 的 CommonJS 输出对齐。
- `generatedFileExtension = "ts"` 决定生成文件的后缀，例如 `client.ts`。
- `importFileExtension = ""` 让生成代码内部的相对导入省略扩展名，例如 `./internal/class`。
- 数据库连接 URL 写在 CLI 配置和运行时配置中。

本课没有业务 model。客户端仍可用于原生查询，不必创建虚构的 User 或教学业务表。[生成选项](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)、[生成命令与模型限制](https://www.prisma.io/docs/cli/v7/generate)

### 5.2 prisma.config.ts

新建 `apps/core-api/prisma.config.ts`，完整内容：

```ts
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({
  path: resolve(__dirname, '.env.migration'),
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('MIGRATION_DATABASE_URL'),
  },
});
```

CommonJS 中的 `__dirname` 表示当前配置所在目录，`resolve(__dirname, '.env.migration')` 将迁移环境文件定位到配置旁边。`env()` 检查变量是否存在；它不会自动读取环境文件，所以前面显式调用 `config()`。本课不配置 shadow URL，也不运行迁移。[Prisma Config 说明](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)

注意：`generate` 也会读取这个配置，所以执行生成之前就需要本地 `.env.migration`；读取变量不等于已连接或迁移数据库。

### 5.3 配置无扩展名的相对导入

先在 `apps/core-api/package.json` 中将顶层 `type` 改为下面的值；保留依赖和其他字段，第 6 节再提供完整 scripts：

```json
{
  "type": "commonjs"
}
```

打开 `apps/core-api/tsconfig.json`，完整内容如下；删除上一版教程添加的 `rewriteRelativeImportExtensions`。不需要升级依赖，也不需要增加打包器：

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "types": ["vitest/globals", "node"]
  }
}
```

现有 `tsconfig.build.json` 继承这个文件，并将 `rootDir` 设为 `./src`，无需调整。`module: nodenext` 并不固定代表 ESM；编译器还会检查本应用的 `type` 字段，此处据此输出 CommonJS。保留现代 Node 的解析规则，无需切换到旧的 `moduleResolution: node10`。仅删掉源码的扩展名、却继续保留 `type: module`，不能得到本课的运行行为。[TypeScript Node 模块模式](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext)

源码、生成与构建的顺序为：

1. `db:generate` 在 `src/generated/prisma/` 生成 `.ts` 文件，内部相对导入省略扩展名。
2. 自己写的源码同样省略相对导入扩展名，例如 `import { PrismaClient } from '../generated/prisma/client'`。
3. `build` 或 `start:dev` 的编译步骤将源码输出到 `dist/`，其中使用无扩展名的 `require` 加载模块。Node 按 CommonJS 规则找到对应的 `.js` 文件。

不要手改生成目录；修改生成器配置后重新运行第 6 节的 `db:generate`。构建产物仍是 `.js` 文件，生产启动继续使用 `node dist/main.js`。CommonJS 文件不支持顶层 `await`，因此第 9 节入口使用 `void bootstrap()`；Prisma CLI 配置按第 5.2 节使用 `__dirname`，不再使用 `import.meta.url`。

为保持 core-api 的写法一致，还需调整下列现有文件中的导入行，其余代码保持原样：

`apps/core-api/src/app.controller.ts`：

```ts
import { AppService } from './app.service';
```

`apps/core-api/src/app.controller.spec.ts`：

```ts
import { AppController } from './app.controller';
import { AppService } from './app.service';
```

`app.module.ts`、`main.ts`、数据库模块和 E2E 的完整代码在后文提供，其中的相对导入已统一省略扩展名。第三方包的路径按其导出契约使用，例如 `@nestjs/common`、`prisma/config`；E2E 的 `supertest/types` 仅用于类型导入。上述规则只针对本课 core-api，不要求修改其他应用。选择与边界见 [core-api 模块格式决定](decisions/0002-core-api-extensionless-imports.md)。

Vitest 的工具配置仍使用 ESM 语法：将 `apps/core-api/vitest.config.ts` 重命名为 `vitest.config.mts`，将 `vitest.config.e2e.ts` 重命名为 `vitest.config.e2e.mts`，内容不变。`.mts` 明确这些配置文件的模块格式，避免 Vitest/Vite 对 CommonJS 包中 ESM 配置语法的提示；它不改变应用源码的无扩展名导入。下面的 E2E 脚本已指向新文件名。

## 6. 更新 core-api 的脚本并生成客户端

打开 `apps/core-api/package.json`，保留安装命令新增的依赖和其他字段，将 **scripts 对象**改成：

```json
{
  "build": "nest build",
  "deploy": "nest deploy",
  "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\" \"!src/generated/**\"",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "start:prod": "node dist/main.js",
  "lint": "oxlint --type-aware --ignore-pattern \"src/generated/**\" src/ test/",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:cov": "vitest run --coverage",
  "test:debug": "vitest --inspect-brk --no-file-parallelism",
  "test:e2e": "vitest run --config ./vitest.config.e2e.mts",
  "db:validate": "prisma validate",
  "db:generate": "prisma generate"
}
```

这是 scripts 的完整内容，不是整个 package.json。顶层仍需保留 `"scripts": { ... }`，不要把上述字段放到清单根部。

两个 `db:` 脚本分别验证 schema 和生成客户端。lint/format 跳过生成目录，生成代码由 Prisma 维护。生产启动明确使用当前构建产物 `dist/main.js`。

执行：

```sh
pnpm --filter @interview-forge/core-api run db:validate
pnpm --filter @interview-forge/core-api run db:generate
```

预期 schema 校验成功，并生成 `apps/core-api/src/generated/prisma/client.ts` 等文件。Prisma 7.10.1 默认允许无模型生成；`--require-models` 才会要求至少存在一个模型。本课直接使用 `prisma generate`，不添加旧的无模型开关。

生成不会创建业务表。每次修改 schema、重装后缺少生成物或换电脑，都应先生成再检查/构建。尤其是改为 `moduleFormat = "cjs"`、`importFileExtension = ""` 后，需要重新生成，避免继续使用旧 ESM 客户端。`db:generate` 只产生源码，`dist/generated/prisma/client.js` 由第 11 节的构建命令产生。本课暂不添加自动生成钩子，以便清楚看见执行顺序。

## 7. 手写 PrismaService

新建 `apps/core-api/src/database/prisma.service.ts`，完整内容：

```ts
import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

function readApplicationDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.username !== 'forge_app' ||
    !url.password ||
    url.pathname !== '/interview_core'
  ) {
    throw new Error(
      'DATABASE_URL must use forge_app, a password, and interview_core',
    );
  }

  return connectionString;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg(
      {
        connectionString: readApplicationDatabaseUrl(),
        connectionTimeoutMillis: 5_000,
        max: 5,
      },
      { schema: 'core' },
    );

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

关键解释：

- 这里读取应用 URL，并提前拒绝缺失配置、错误协议和迁移/管理账号。这是本课本地配置约束，不能代替 PostgreSQL 真实授权。
- 检查发生在创建 Provider 时，不在模块导入时读取变量，便于测试替换整个 Provider。
- 适配器第二参数明确选择 `core`，不依赖 pg 解释 Prisma URL 的 `schema` 参数。[PostgreSQL 适配器配置](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql#common-patterns)
- `connectionTimeoutMillis: 5_000` 是连接等待上限；`max: 5` 是本地连接池上限。它们是练习配置，不是性能实测结论，也不等于 SQL 执行超时。[pg Pool 配置](https://node-postgres.com/apis/pool)
- Nest 初始化时连接，销毁时释放；整个应用复用这个 Provider，无需每次请求创建客户端。[Nest 生命周期](https://docs.nestjs.com/fundamentals/lifecycle-events)

## 8. 手写 DatabaseModule 并装配

### 8.1 DatabaseModule

新建 `apps/core-api/src/database/database.module.ts`，完整内容：

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

`providers` 注册实例；`exports` 让导入此模块的其他模块可以使用它。后续业务模块需要数据库时显式导入此模块。

### 8.2 AppModule

修改 `apps/core-api/src/app.module.ts`，完整内容：

```ts
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    DatabaseModule,
    ObserveModule.forRoot({
      enabled: process.env.NODE_ENV !== 'test',
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'core-api',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

核心变化是导入 DatabaseModule。原有示例 Controller、Service 和 Observe 配置沿用，不需要开通监控账号。

## 9. 修改入口，加载应用配置并执行真实查询

修改 `apps/core-api/src/main.ts`，完整内容：

```ts
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { PrismaService } from './database/prisma.service';

type DatabaseCheck = {
  database_user: string;
  database_name: string;
  schema_usage: boolean;
  schema_create: boolean;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableShutdownHooks();

  try {
    await app.init();

    const prisma = app.get(PrismaService);
    const [check] = await prisma.$queryRaw<DatabaseCheck[]>`
      SELECT
        current_user::text AS database_user,
        current_database()::text AS database_name,
        has_schema_privilege(current_user, 'core', 'USAGE') AS schema_usage,
        has_schema_privilege(current_user, 'core', 'CREATE') AS schema_create
    `;

    if (
      !check ||
      check.database_user !== 'forge_app' ||
      check.database_name !== 'interview_core' ||
      check.schema_usage !== true ||
      check.schema_create !== false
    ) {
      throw new Error('PostgreSQL application role/schema check failed');
    }

    Logger.log(JSON.stringify(check), 'DatabaseCheck');

    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    await app.close();
    throw error;
  }
}

void bootstrap();
```

理解运行顺序：

1. 入口加载应用 `.env`。
2. Nest 创建 Provider，`app.init()` 触发数据库连接。
3. 用实际连接查询账号、数据库和 `core` 权限。
4. 验收成功后监听 HTTP；失败则关闭已创建的应用并报错。
5. Ctrl+C / SIGTERM 通过关闭钩子释放连接。[Nest 生命周期说明](https://docs.nestjs.com/fundamentals/lifecycle-events)

`$queryRaw` 使用标签模板，SQL 为固定只读查询；`::text` 将 PostgreSQL 的 name 类型转成客户端能明确处理的文本。泛型描述返回形状，后面的判断检查实际值。日志只记录非敏感验收字段，不能把连接 URL 或整个环境对象加入日志。[Prisma 原生查询](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries)

当前没有修改 PostgreSQL 的 `search_path`，本课也不检查 `current_schema()` 必为 core；默认 schema 配置与 PostgreSQL 会话搜索路径不能混为一谈。

这段启动查询是本课验收措施。它只证明启动时的连接与指定权限，不等于持续健康监测、网站用户鉴权或业务表读写验收。

## 10. 调整现有默认 E2E

现有 E2E 导入 AppModule。加入 DatabaseModule 后，它会实例化 PrismaService，因此需要明确替换数据库 Provider，让原有默认 HTTP 示例检查保持独立。

修改 `apps/core-api/test/app.e2e-spec.ts`，完整内容：

```ts
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
```

这里替换的是整个 Provider，所以原构造函数和连接生命周期都不执行。默认路由不调用数据库方法，空替身足够。E2E 不执行 main.ts，因此也不会运行入口的真实查询。[Nest Provider 覆盖](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)

现有 `src/app.controller.spec.ts` 的测试行为无需修改，只需按第 5.3 节统一相对导入的扩展名。该单测和默认 E2E 都不能证明真实数据库连接正常；真实验收在第 12 步。后续业务数据库测试需要独立的隔离数据与真实数据库方案。

## 11. 执行静态检查、现有测试和构建

确认已生成客户端后，从仓库根依次执行：

```sh
pnpm --filter @interview-forge/core-api run lint
pnpm --filter @interview-forge/core-api exec tsc --noEmit --incremental false
pnpm --filter @interview-forge/core-api run test
pnpm --filter @interview-forge/core-api run test:e2e
pnpm --filter @interview-forge/core-api run build
```

每条都应成功。本应用目前没有单独的类型检查脚本，所以使用已有 TypeScript CLI；不假设根存在 test/dev 转发脚本。

预期默认单测 1 个、默认 E2E 1 个通过；构建产物包括 `apps/core-api/dist/main.js` 及生成客户端对应的 JS 文件。打开 `apps/core-api/dist/database/prisma.service.js`，应看到 `require("../generated/prisma/client")`；源码中的无扩展名导入已编译为 CommonJS。以实际输出为准，失败时不要将本课记录为通过。

## 12. 验证本机 Nest 的真实运行连接

### 12.1 开发启动

在第一个终端从仓库根启动：

```sh
pnpm --filter @interview-forge/core-api run start:dev
```

通过 filter 执行应用脚本时，工作目录是 core-api，因此入口读取 `apps/core-api/.env`。不要在根直接执行 `node apps/core-api/dist/main.js`，那会改变 dotenv 查找默认环境文件的位置。

预期出现 DatabaseCheck 日志，字段如下，日志前缀与排版以实际输出为准：

```json
{"database_user":"forge_app","database_name":"interview_core","schema_usage":true,"schema_create":false}
```

随后服务监听 3001。在第二个终端执行：

```sh
curl -i http://127.0.0.1:3001/
```

预期 HTTP 200，正文 `Hello World!`。这证明默认 HTTP 示例可用；上面的真实查询另行证明数据库连接和指定权限。

### 12.2 构建产物启动

在开发终端按 Ctrl+C 停止，再运行：

```sh
pnpm --filter @interview-forge/core-api run start:prod
```

再次确认 DatabaseCheck 四个字段与 HTTP 200。这个步骤验证编译后的 CommonJS 产物确实能加载生成客户端，不能仅凭开发启动成功跳过。

完成后 Ctrl+C 停止。此处 prod 是运行构建产物的脚本名，环境仍是本机开发环境，不代表生产部署完成。

## 13. 验证迁移凭据的本机连接

02A 验证的是容器内 psql；这里再验证未来工具从本机连接所用的迁移 URL。下面是独立的只读检查，Node 只加载迁移环境文件。

从仓库根完整执行以下多行命令。最外层单引号需要一起输入，代码中没有真实密码：

```sh
pnpm --filter @interview-forge/core-api exec node --env-file=.env.migration --input-type=module -e '
import pg from "pg";

if (!process.env.MIGRATION_DATABASE_URL) {
  throw new Error("MIGRATION_DATABASE_URL is required");
}

const client = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

try {
  await client.connect();
  const { rows } = await client.query(
    "SELECT current_user::text AS database_user, current_database()::text AS database_name, has_schema_privilege(current_user, $1, $2) AS schema_create",
    ["core", "CREATE"],
  );
  const check = rows[0];

  if (
    !check ||
    check.database_user !== "forge_migrator" ||
    check.database_name !== "interview_core" ||
    check.schema_create !== true
  ) {
    throw new Error("PostgreSQL migration role/schema check failed");
  }

  console.table(rows);
} finally {
  await client.end();
}
'
```

预期账号为 `forge_migrator`、数据库为 `interview_core`、`schema_create=true`。这条命令使用 pg 验证迁移凭据的实际连通性，**没有执行 Prisma 迁移**。CLI 是否读取正确配置由前面的 validate/generate 与配置检查验证；迁移行为留待 02C。

外层单引号防止 shell 展开 SQL 参数 `$1`、`$2`；查询值通过参数数组传入。`finally` 保证成功或失败都释放客户端连接。这里的 `--input-type=module` 只指定这条独立 Node 检查命令的执行方式，不改变 core-api 的 CommonJS 配置。[pg 参数化查询](https://node-postgres.com/features/queries)

## 14. 验证缺失配置会明确失败

先确保运行中的 core-api 已停止，再从根执行：

```sh
DATABASE_URL= pnpm --filter @interview-forge/core-api run start:prod
```

这只为本次命令传入空变量，不修改环境文件。dotenv 默认不会覆盖已经存在的进程变量，因此应提示 `DATABASE_URL is required` 并失败退出，不进入 HTTP 监听。

然后恢复正常命令：

```sh
pnpm --filter @interview-forge/core-api run start:prod
```

应再次通过真实连接验收。完成后停止应用。这个失败检查用于证明配置缺失会及早暴露，不需要修改数据库账号权限。

## 15. 常见错误按这张表查

| 现象 | 先检查 |
| --- | --- |
| MIGRATION_DATABASE_URL 缺失 | `.env.migration` 是否在 core-api 下，变量名是否一致；CLI 配置只读取此文件 |
| DATABASE_URL 缺失 | 应用 `.env` 是否存在，是否通过本文 filter 脚本启动，是否传入了空的进程变量 |
| URL/账号校验失败 | 是否误填迁移/管理账号，是否需要 URL 编码，数据库名是否对应 |
| 密码认证失败 | 02A 对应角色的密码、URL 编码及数据库连接目标；不要贴出连接 URL |
| ECONNREFUSED | Docker 是否运行、PostgreSQL 是否 healthy、映射端口与 URL 是否相同 |
| application role/schema check failed | 真实账号、库名和 core 的 USAGE/CREATE 是否与 02A 一致 |
| 生成客户端找不到 | 是否先执行 db:generate，输出目录和导入路径是否一致 |
| 提示 ESM 相对导入必须有扩展名 | core-api 的 `type` 是否已改为 `commonjs`；不要只删扩展名却保留 ESM 包声明 |
| import.meta / 顶层 await 编译失败 | CLI 配置是否使用 `__dirname`，入口是否使用 `void bootstrap()` |
| 编译或运行时找不到相对模块 | 源码相对导入是否省略后缀，生成器是否改为 `cjs` 和空导入后缀并重新生成；运行的是最新 `dist` 产物 |
| TS6059 / rootDir | 生成输出是否位于 core-api 的 src 内；不要照抄其他布局的路径 |
| 默认 E2E 意外要求本地数据库 | 是否在 compile 前覆盖 PrismaService，是否在模块顶层读取环境并抛错 |
| EADDRINUSE | 3001 是否已有另一个 core-api；先停止旧进程 |

`schema_create=true` 对应用账号是权限异常，需要核对 02A 的角色和 schema 所有权。不能把启动断言改成接受 true 来跳过问题。

## 16. 整理文件并记录实际验收

最终手写/修改的文件为：

```text
.gitignore
apps/core-api/package.json
apps/core-api/tsconfig.json
apps/core-api/vitest.config.mts
apps/core-api/vitest.config.e2e.mts
apps/core-api/.env.example
apps/core-api/.env.migration.example
apps/core-api/.env                     本机文件，忽略
apps/core-api/.env.migration           本机文件，忽略
apps/core-api/prisma.config.ts
apps/core-api/prisma/schema.prisma
apps/core-api/src/database/prisma.service.ts
apps/core-api/src/database/database.module.ts
apps/core-api/src/app.controller.ts
apps/core-api/src/app.controller.spec.ts
apps/core-api/src/app.module.ts
apps/core-api/src/main.ts
apps/core-api/test/app.e2e-spec.ts
```

根锁文件由安装更新；若批准构建脚本，根 workspace 配置也会变化。`src/generated/prisma/` 和 `dist/` 分别由生成与构建产生。

查看状态与忽略规则：

```sh
git status --short
git diff --stat
git check-ignore apps/core-api/.env apps/core-api/.env.migration apps/core-api/src/generated/prisma/client.ts
```

最后一条应列出三个被忽略的路径。示例环境文件、schema、源码、清单和根锁文件需要保留；不要强制加入真实环境文件。现有其他文档或源码改动也要保留，不因本课清理掉它们。

| 验收项 | 当前结果 |
| --- | --- |
| 02A 账号与权限验收 | 旧机完整结果待确认；新机重新执行 |
| Prisma 7 依赖与单一根锁文件 | 已提交配置；安装和版本按第 3 节实际输出核对 |
| validate 与零模型客户端生成 | 脚本与 schema 已提交；生成物被忽略，本机须重新执行 |
| 无扩展名源码导入与 CommonJS 构建产物 | 教学示例已更新；按本课生成、检查和构建后验收 |
| lint、类型、默认单测、默认 E2E、build | 本次模块格式调整已通过；完整数据库接入后按第 11 节重跑 |
| 开发启动：forge_app / interview_core / true / false | 等待用户执行 |
| 构建产物启动与 HTTP 200 | 等待用户执行 |
| 迁移凭据本机连接：forge_migrator / interview_core / true | 等待用户执行 |
| 缺失 DATABASE_URL 明确失败，正常启动可恢复 | 等待用户执行 |
| 本地凭据与生成物被 Git 忽略 | 等待用户执行 |

2026-10-25 导入约定更新：本课已从显式 `.ts` 导入改为无扩展名导入，core-api、Prisma 生成器与 CLI 配置同步采用 CommonJS。具体检查与运行结果见 [状态表](status.md)；默认 HTTP 示例和生成客户端的模块加载验证不代替真实数据库账号、权限及业务验收。

写完后提供以上命令的成功/失败结果即可；如有报错，提供去除凭据后的错误文本。我再检查实际文件并按执行证据维护状态和交接。

本课完成后，02C 才安排第一个有业务意义的模型与迁移：先明确字段和约束，由管理账号预建独立专用 shadow 数据库，生成并审查 SQL，再执行迁移和业务表授权。已有第一课数据、core 以外对象以及迁移元数据的边界要在那一课核对；不提前运行 db push、migrate reset 或对当前数据库做清理。
