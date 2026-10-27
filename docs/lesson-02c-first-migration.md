# 手写学习 02C：首个业务模型、迁移与逐表授权

日期：2026-10-26。状态：**教学步骤已提供，等待用户手写和执行**。上一课 02B 按用户“本课完成”的反馈记录；本课没有替用户创建角色、数据库、迁移或业务数据。

本课交付：用已安装的 Prisma **7.10.1** 建立用户资料模型，将审核过的 SQL 迁移应用到 `interview_core.core`，证明应用账号能读写指定业务表，又不能删除用户或读取迁移元数据。

沿用 core-api 当前的 **CommonJS 输出、无扩展名相对导入**，不新增依赖、不切回 ESM。所有终端命令从仓库根执行；标为 SQL 或 psql 的内容进入数据库客户端后执行。

```sh
cd /Users/ytg/Documents/study/interview-study
```

## 1. 本课业务范围

先建立 `User`：它保存稳定用户 ID、显示名称和账号状态，后续练习归属引用这个 ID。登录标识、密码哈希、设备会话分别在身份课实现，本课不提前确定认证库，也不增加公开的用户写入接口。

| 字段 | 含义与约束 |
| --- | --- |
| id | UUID 主键；Prisma 创建记录时生成 |
| displayName | 最多 80 个字符；不能为 NULL、空串或只含普通空格 |
| status | ACTIVE / DISABLED，默认 ACTIVE；此处只保存状态，尚未实现登录拦截 |
| createdAt | 数据库默认当前时间，带时区，毫秒精度 |
| updatedAt | Prisma 写入时维护，带时区，毫秒精度 |

显示名称不作为登录标识，也不要求唯一。这里的 User 是网站业务记录，与 PostgreSQL 的 `forge_app` 等连接角色不同。

本课按“检查目标 → 准备 shadow → 修改模型 → 生成草稿 → 审核 SQL → 应用 → 重放和读写验收”推进。

## 2. 检查已有数据库，保留第一课数据

先停止正在运行的 core-api，再检查容器：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml ps
```

应为 running/healthy。以现有管理账号进入业务数据库：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml exec postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

手写并执行以下只读 SQL：

```sql
SELECT current_user, current_database();

SELECT nspname, pg_get_userbyid(nspowner) AS schema_owner
FROM pg_namespace
WHERE nspname IN ('core', 'learning_probe');

SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname IN ('core', 'learning_probe')
ORDER BY schemaname, tablename;

SELECT t.typname
FROM pg_type AS t
JOIN pg_namespace AS n ON n.oid = t.typnamespace
WHERE n.nspname = 'core' AND t.typtype IN ('e', 'd');

SELECT to_regclass('core._prisma_migrations') AS migration_table;

SELECT
  has_database_privilege('forge_migrator', 'interview_core', 'CREATE') AS migrator_can_create_schema,
  has_schema_privilege('forge_app', 'core', 'USAGE') AS app_schema_usage,
  has_schema_privilege('forge_app', 'core', 'CREATE') AS app_schema_create;
```

逐项对照预期，注意“当前登录账号”和“schema 所有者”是两个不同字段：

| 查询 | 检查对象 | 预期结果 |
| --- | --- | --- |
| current_user / current_database() | 当前连接的身份和数据库 | forge_bootstrap / interview_core |
| pg_namespace 中 core 这一行 | core schema 的所有者 | core / forge_migrator |
| pg_tables | 已有表及其所有者 | core 尚无表；learning_probe 的已有表可以存在 |
| pg_type | core 中的枚举与 domain 类型 | 无记录 |
| to_regclass | core._prisma_migrations 是否存在 | NULL，psql 默认通常显示为空白 |
| migrator_can_create_schema | forge_migrator 在 interview_core 的数据库级 CREATE | false |
| app_schema_usage | forge_app 对 core 的 USAGE | true |
| app_schema_create | forge_app 对 core 的 CREATE | false |

这里是以 forge_bootstrap 登录，查看 core 是否归 forge_migrator 所有，并核查指定角色的权限。has_*_privilege 的第一个参数明确写了要检查的角色，所以最后三个布尔值不代表 forge_bootstrap 自己的权限，执行查询也不会切换当前账号。

数据库级 CREATE 为 false 表示 forge_migrator 不能在该库中新建 schema；它仍可在自己拥有的 core schema 中建表。若第一条显示 forge_bootstrap / interview_core，说明当前连接符合预期；core 的所有权要另外看第二条，不能从第一条推断。

若 core 已有业务对象、未删除的教学探针或历史迁移，先停在这里核对实际来源，不套用“空 core 的首迁移”。不要因 Prisma 提示而接受 reset。第一课的 `learning_probe` 属于其他 schema，保留，不把它加入 Prisma 模型。

如果本机还保留第一课的探针表，记录迁移前结果，迁移后对照：

```sql
SELECT id, note FROM learning_probe.persistence_check;
```

若此电脑从未建立该探针，记录这一点即可；Git 不会恢复旧电脑的数据卷，本课不补造持久化验收。

## 3. 管理账号预建独立 shadow 库

shadow 用于重放迁移、比较结构，内容可被清理。它必须是独立专用库。[shadow 工作方式](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)

本课新增一个连接角色，分工如下：

| 角色 | 目标 | 能力 |
| --- | --- | --- |
| forge_bootstrap | 管理准备 | 创建角色、数据库、schema |
| forge_migrator | interview_core.core | 迁移业务结构，不拥有数据库级 CREATE 或集群级 CREATEDB |
| forge_app | interview_core.core | 运行时只访问逐表授权的业务对象 |
| forge_shadow | interview_core_shadow | 拥有专用 shadow 库，允许重建其中的 core |

仍在上一步管理账号的 psql 中执行：

```sql
CREATE ROLE forge_shadow
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;
```

交互设置一个独立本地密码，输入不会作为 SQL 文件保存：

```text
\password forge_shadow
```

再逐条执行，**不要放进 BEGIN/COMMIT**：

```sql
CREATE DATABASE interview_core_shadow
  OWNER forge_shadow
  TEMPLATE template0;

REVOKE ALL ON DATABASE interview_core_shadow FROM PUBLIC;
```

`CREATE DATABASE` 不能在事务中执行。template0 避免复制本地 template1 中可能已有的业务对象。[PostgreSQL 建库说明](https://www.postgresql.org/docs/18/sql-createdatabase.html)

切换到 shadow 库，身份仍为管理账号：

```text
\connect interview_core_shadow
```

```sql
SELECT current_user, current_database();

CREATE SCHEMA core AUTHORIZATION forge_shadow;
REVOKE ALL ON SCHEMA core FROM PUBLIC;

SELECT
  has_database_privilege('forge_shadow', 'interview_core_shadow', 'CONNECT') AS shadow_connect,
  has_database_privilege('forge_app', 'interview_core_shadow', 'CONNECT') AS app_connect,
  has_database_privilege('forge_migrator', 'interview_core_shadow', 'CONNECT') AS migrator_connect;
```

预期 true / false / false。若已有同名角色或数据库，先查看所有者和内容，不删除重建，也不直接忽略冲突后继续。

角色是实例级对象，因此同一个实例里的 shadow 重放能够识别 `forge_app`。将来换到独立数据库实例，须先准备同名运行角色；迁移 SQL 不保存账号密码或创建角色。

这不等于全实例连接隔离：若业务库仍向 PUBLIC 开放 CONNECT，`forge_shadow` 可能连接业务库，但没有业务 core 的所有权和对象权限。本课只收紧专用 shadow 库的连接入口。

输入 `\q` 退出，检查新角色密码登录：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml exec postgres psql -h postgres -U forge_shadow -d interview_core_shadow -W
```

沿用 02A 的方法：错误密码应被拒绝，重新执行后输入正确密码应成功。进入后执行 `SELECT current_user, current_database();`，预期 `forge_shadow / interview_core_shadow`，再 `\q` 返回终端。

## 4. 手写迁移环境配置与目标校验

### 4.1 环境示例

将 `apps/core-api/.env.migration.example` 更新为：

```dotenv
MIGRATION_DATABASE_URL="postgresql://forge_migrator:replace_with_url_encoded_migrator_password@127.0.0.1:5432/interview_core?schema=core"
SHADOW_DATABASE_URL="postgresql://forge_shadow:replace_with_url_encoded_shadow_password@127.0.0.1:5432/interview_core_shadow?schema=core"
```

在本机 `apps/core-api/.env.migration` 中保留原来的真实迁移 URL，新增对应 shadow URL；密码中的特殊字符按 02B 进行 URL 编码。示例文件始终保留非敏感示例。

应用 `.env` 中仍只有应用连接，不加入这两个高权限凭据。若本机数据库名或映射端口不同，示例、本地配置和以下断言必须一起对应调整。

### 4.2 CLI 配置

将 `apps/core-api/prisma.config.ts` 手写为以下完整内容：

```ts
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ path: resolve(__dirname, '.env.migration') });

function readDatabaseUrl(
  variableName: string,
  expectedUser: string,
  expectedDatabase: string,
): string {
  const value = env(variableName);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.username !== expectedUser ||
    !url.password ||
    url.pathname !== `/${expectedDatabase}` ||
    url.searchParams.get('schema') !== 'core'
  ) {
    throw new Error(
      `${variableName} must use ${expectedUser}, ${expectedDatabase}, and schema=core`,
    );'
  }

  return value;
}

const migrationUrl = readDatabaseUrl(
  'MIGRATION_DATABASE_URL',
  'forge_migrator',
  'interview_core',
);
const shadowUrl = readDatabaseUrl(
  'SHADOW_DATABASE_URL',
  'forge_shadow',
  'interview_core_shadow',
);
const migrationTarget = new URL(migrationUrl);
const shadowTarget = new URL(shadowUrl);

if (
  migrationTarget.hostname !== shadowTarget.hostname ||
  (migrationTarget.port || '5432') !== (shadowTarget.port || '5432')
) {
  throw new Error('This lesson requires both databases on the same instance');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: migrationUrl,
    shadowDatabaseUrl: shadowUrl,
  },
});
```

两个 URL 的账号、数据库、schema 均有明确校验，避免把业务库误填成 shadow。错误信息只输出变量名和非敏感目标，不输出连接串。保持单份配置文件，不另建会优先覆盖它的 `prisma7.config.ts`。

`shadowDatabaseUrl` 属于 Prisma CLI 配置。[Prisma Config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference#datasourceshadowdatabaseurl)

本课是本地开发配置，所有 CLI 命令都会先读取这两个变量，即使命令本身不使用 shadow。后续部署课再拆分部署所需环境，不能据此要求生产环境也运行 shadow。

## 5. 手写首个业务模型

将 `apps/core-api/prisma/schema.prisma` 更新为以下完整内容：

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

enum UserStatus {
  ACTIVE
  DISABLED

  @@map("user_status")
}

model User {
  id          String     @id @default(uuid()) @db.Uuid
  displayName String     @map("display_name") @db.VarChar(80)
  status      UserStatus @default(ACTIVE)
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt   DateTime   @updatedAt @map("updated_at") @db.Timestamptz(3)

  @@map("users")
}
```

理解映射：Prisma 用 `User / displayName`，数据库用 `core.users / display_name`；默认 schema 由迁移 URL 的 `schema=core` 和运行适配器的 `{ schema: 'core' }` 分别指定。

`uuid()` 和 `@updatedAt` 属于 Prisma 层行为：前者不会在表中生成数据库 UUID 默认值，后者不是 PostgreSQL 更新触发器。`now()` 则对应数据库默认时间。UUID 不使用自增序列，所以本课无需序列授权。[Schema API](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)

“非空名称”的 CHECK 约束稍后手写进迁移。Prisma schema 不能完整表达这个 CHECK；后续修改结构时需保留并检查这段 SQL，不把重新 introspect 当作全部约束的替代品。

## 6. 增加本课脚本

打开 `apps/core-api/package.json`，在已有 scripts 对象中新增以下五项，保留其余脚本和依赖：

```json
{
  "db:migrate:draft": "prisma migrate dev --create-only",
  "db:migrate:deploy": "prisma migrate deploy",
  "db:migrate:status": "prisma migrate status",
  "db:migrate:check": "prisma migrate diff --from-migrations prisma/migrations --to-config-datasource --exit-code",
  "db:verify:user": "node scripts/verify-user-model.cjs"
}
```

这是新增的五个字段，不是整个 scripts 的替换内容。需要在相邻属性之间正确添加逗号。原来的 `db:generate` 继续为 `prisma generate`。

| 脚本 | 作用与边界 |
| --- | --- |
| db:migrate:draft | 使用 shadow 检查并生成草稿，供应用前审查 |
| db:migrate:deploy | 只应用待执行迁移，不检测 drift、不生成客户端 |
| db:migrate:status | 比较本地迁移目录与数据库迁移记录 |
| db:migrate:check | 在 shadow 重放最终迁移 SQL，再与业务库结构比较 |
| db:verify:user | 使用应用账号验证新模型，事务结束后不保留教学记录 |

## 7. 生成迁移草稿

从仓库根依次执行：

```sh
pnpm --filter @interview-forge/core-api run db:validate
pnpm --filter @interview-forge/core-api run db:migrate:draft --name create_users
```

预期生成类似 `apps/core-api/prisma/migrations/20261026……_create_users/migration.sql` 的文件，时间前缀以实际生成结果为准；还会有迁移锁定文件 `migration_lock.toml`，保留并提交。

**`--create-only` 不等于只读或离线。** 它会连接数据库、使用 shadow 并检查 drift，也可能初始化迁移元数据；本课首迁移的业务建表 SQL 此时尚未应用。遇到“需要 reset / 数据将丢失”的提示立即取消并检查第 2 节，不确认重置。[migrate dev](https://www.prisma.io/docs/cli/v7/migrate/dev)

若报 P3014，检查 shadow URL 是否被读取、是否是专用库及所有者权限；不为跳过错误授予 forge_app 超级用户，也不临时给迁移角色 CREATEDB。

## 8. 审查并手写最终迁移 SQL

打开刚生成的 `migration.sql`。这是应用前可以编辑的草稿。[编辑迁移的工作流](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/customizing-migrations)

**自动生成的草稿与下方人工整理后的最终版不必逐字相同。** 当前单 schema 配置下，实际草稿可能是 `CREATE TYPE "user_status"`、`CREATE TABLE "users"`，没有显式 core 前缀，也没有 BEGIN/COMMIT、名称 CHECK 或应用账号 GRANT。这属于本课预期的起始草稿，不表示模型生成失败。

| 差异 | 最终版为何补充 |
| --- | --- |
| 对象名前加 core | 明确目标 schema；无前缀名称本身依赖执行连接的搜索路径，本课 Prisma 迁移连接配置 schema=core |
| BEGIN / COMMIT | 将本次短小 DDL 和授权放进同一事务 |
| users_display_name_not_blank | 手写 Prisma 模型不能完整表达的名称 CHECK |
| GRANT SELECT, INSERT, UPDATE | 将应用账号的逐表权限纳入可重放迁移 |

所以要比较“生成的结构是否符合模型”与“业务所需补充是否齐全”，不能只按文本完全相同来判断。下面明确展示的是**需要你在应用前手写整理的最终 SQL**，不是原始生成输出。原始无前缀草稿也不能脱离迁移连接的上下文，直接假定在任意 psql 会话里都会进入 core。

先识别生成的 enum、表、主键、默认值和字段映射。本课最终内容如下；核对模型完全一致后，将这份**尚未应用**的首迁移整理为：

```sql
BEGIN;

CREATE TYPE "core"."user_status" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "core"."users" (
  "id" UUID NOT NULL,
  "display_name" VARCHAR(80) NOT NULL,
  "status" "core"."user_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_display_name_not_blank"
    CHECK (char_length(btrim("display_name")) > 0)
);

GRANT SELECT, INSERT, UPDATE
ON TABLE "core"."users"
TO forge_app;

COMMIT;
```

审查时理解以下几件事：

- core 已由管理账号预建，本迁移只建立其中的对象。如果生成器写了 `CREATE SCHEMA IF NOT EXISTS "core"`，本课在首次应用前去掉它。PostgreSQL 18 对该语句仍检查数据库级 CREATE；拥有 core 不代表能创建 schema。数据库级 CREATE 与集群级 CREATEDB 又是两种不同权限。[CREATE SCHEMA](https://www.postgresql.org/docs/18/sql-createschema.html)、[PG18 权限检查源码](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/schemacmds.c)
- 新电脑要先恢复角色和预建 schema，再执行这些迁移。它不是从任意超级用户空环境开始的全自动基础设施脚本。
- shadow 的 core 在准备阶段预建；Prisma 7.10.1 还会按 shadow URL 的默认 schema 重置并重建它，所以后续重放不依赖迁移中的建 schema 语句。[对应引擎源码](https://github.com/prisma/prisma-engines/blob/7.10.1/schema-engine/connectors/sql-schema-connector/src/flavour/postgres.rs)
- `NOT NULL` 不会拒绝空字符串，所以额外添加 CHECK。这里的 btrim 排除普通首尾空格；完整文本输入规范仍需未来 API 校验。[PostgreSQL 约束](https://www.postgresql.org/docs/18/ddl-constraints.html)
- 只给 users 的 SELECT / INSERT / UPDATE。没有 DELETE、TRUNCATE、表所有权、schema CREATE，也没有全 schema 自动授权。[GRANT](https://www.postgresql.org/docs/18/sql-grant.html)
- `_prisma_migrations` 是迁移工具元数据，不给应用读写权限。GRANT 写在迁移里，换环境重放时才能复现；不手工在库中补完后忘记记录。
- 当前短小 DDL 和授权都支持事务，因此一起 BEGIN / COMMIT；失败时不能留下只建了一半的本次结构。不要把这个结论套到所有未来 SQL，例如并发创建索引有不同事务限制。

本课不额外改变 enum 类型的默认权限；TYPE 的 USAGE 与表 DML 是不同层次，不把给 enum 授权当作读写该列的必要条件。[对象权限](https://www.postgresql.org/docs/18/ddl-priv.html)

保存后，确认 SQL 中只有以上目标对象和逐表授权，没有 DROP、TRUNCATE、数据库/角色创建、改所有者或真实密码。

## 9. 应用迁移并检查状态

从仓库根执行：

```sh
pnpm --filter @interview-forge/core-api run db:migrate:deploy
pnpm --filter @interview-forge/core-api run db:migrate:status
```

预期应用 `create_users`，随后状态为数据库迁移已同步。本课用 deploy 应用已审查 SQL；它不使用 shadow、不检查 drift，也不自动 generate，不能将“deploy 成功”等同于模型、数据库、权限全部通过。[migrate deploy](https://www.prisma.io/docs/cli/v7/migrate/deploy)

若迁移失败，保留原错误和迁移记录，检查实际数据库状态。不要删除迁移目录、编辑已经成功应用的文件、直接标记为成功或 reset。修复失败迁移需要根据事务是否回滚、是否有残留对象再决定，本课不提供通用的“忽略失败”命令。

2026-10-26 实际排查：用户手写时遗漏主键约束末尾的逗号，首次 deploy 以 P3018 / 42601 失败。实际文件含事务包裹；须先修正并确认业务对象无残留，再通过 resolve --rolled-back 允许重试。完整步骤见 [本次失败迁移恢复](runbooks/2026-10-26-first-migration-p3018.md)，恢复结果尚待用户反馈。

成功应用后，这个 migration.sql 进入历史，不再修改。下次改模型要生成新的迁移。

## 10. 检查迁移能否重放

执行：

```sh
pnpm --filter @interview-forge/core-api run db:migrate:check
```

该命令会清理专用 shadow 中的结构，重放**刚才编辑后的完整迁移 SQL**，再与业务 core 比较；不执行比较出来的差异 SQL。预期无结构差异、退出码 0。退出码 1 为执行错误，2 表示存在差异，都需要排查。[migrate diff](https://www.prisma.io/docs/cli/v7/migrate/diff)

这一步验证审核后的迁移可以在预建好的专用环境重放。Prisma 不建模的 CHECK、GRANT 等不能只靠 diff 判断，后面继续验收。

若保留了第一课的探针，以管理账号重新读取 `learning_probe.persistence_check`，对照第 2 节结果。连接 URL 与生成 SQL 均限定 core，本课不得清理其他 schema。

## 11. 生成客户端、检查并构建

Prisma 7 的迁移命令不再自动运行 generate 或 seed。本课明确执行：

```sh
pnpm --filter @interview-forge/core-api run db:generate
pnpm --filter @interview-forge/core-api run lint
pnpm --filter @interview-forge/core-api exec tsc --noEmit --incremental false
pnpm --filter @interview-forge/core-api run test
pnpm --filter @interview-forge/core-api run test:e2e
pnpm --filter @interview-forge/core-api run build
```

预期各项通过，默认单测 1 个、默认 E2E 1 个；生成客户端出现 user 的类型和操作方法。E2E 仍用替身覆盖数据库 Provider，不证明新表真实可访问；下面的独立检查补上真实读写。

## 12. 手写应用账号读写验收脚本

新建 `apps/core-api/scripts/verify-user-model.cjs`，完整内容：

```js
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { config } = require('dotenv');

config({ path: resolve(__dirname, '../.env') });

const { PrismaService } = require('../dist/database/prisma.service');
const { UserStatus } = require('../dist/generated/prisma/client');

class ExpectedRollback extends Error {}

async function main() {
  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const [connection] = await prisma.$queryRaw`
      SELECT
        current_user::text AS database_user,
        current_database()::text AS database_name
    `;
    assert.equal(connection.database_user, 'forge_app');
    assert.equal(connection.database_name, 'interview_core');

    const [permissions] = await prisma.$queryRaw`
      SELECT
        has_schema_privilege(current_user, 'core', 'CREATE') AS schema_create,
        has_table_privilege(current_user, 'core.users', 'SELECT') AS users_select,
        has_table_privilege(current_user, 'core.users', 'INSERT') AS users_insert,
        has_table_privilege(current_user, 'core.users', 'UPDATE') AS users_update,
        has_table_privilege(current_user, 'core.users', 'DELETE') AS users_delete,
        has_table_privilege(
          current_user,
          'core._prisma_migrations',
          'SELECT,INSERT,UPDATE,DELETE'
        ) AS migration_dml
    `;
    assert.equal(permissions.schema_create, false);
    assert.equal(permissions.users_select, true);
    assert.equal(permissions.users_insert, true);
    assert.equal(permissions.users_update, true);
    assert.equal(permissions.users_delete, false);
    assert.equal(permissions.migration_dml, false);

    let createdId;

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { displayName: '02C 验收学员' },
        });
        createdId = user.id;
        assert.equal(user.status, UserStatus.ACTIVE);
        assert.ok(user.createdAt instanceof Date);
        assert.ok(user.updatedAt instanceof Date);

        const loaded = await tx.user.findUniqueOrThrow({
          where: { id: createdId },
        });
        assert.equal(loaded.displayName, '02C 验收学员');

        const updated = await tx.user.update({
          where: { id: createdId },
          data: {
            displayName: '02C 验收学员（已修改）',
            status: UserStatus.DISABLED,
          },
        });
        assert.equal(updated.displayName, '02C 验收学员（已修改）');
        assert.equal(updated.status, UserStatus.DISABLED);

        throw new ExpectedRollback('02C verification rollback');
      });
    } catch (error) {
      if (!(error instanceof ExpectedRollback)) {
        throw error;
      }
    }

    assert.ok(createdId, 'The verification must create a user first');
    const afterRollback = await prisma.user.findUnique({
      where: { id: createdId },
    });
    assert.equal(afterRollback, null);
  } finally {
    await prisma.$disconnect();
  }

  console.log('02C passed: application permissions, create/read/update, rollback');
}

main().catch((error) => {
  console.error('02C verification failed');
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
```

这个独立脚本复用编译后的 PrismaService，只加载应用 `.env`。`.cjs` 明确使用 CommonJS，运行它不需要新增 tsx 等依赖；相对 require 路径沿用省略扩展名的约定。

流程是：核对真实账号与权限 → 在一个事务里新增、读取、修改教学用户 → 主动抛出专用错误回滚 → 在事务外确认记录不存在。其他错误原样作为失败处理，不把真实错误误认成预期回滚。[Prisma 事务](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)

它证明真实 PostgreSQL 上的模型读写与回滚，不是 mock 测试，也不是持久化/登录验收。脚本只输出结论和错误消息，不输出连接 URL 或已有用户数据。

先检查语法，再执行：

```sh
pnpm --filter @interview-forge/core-api exec node --check scripts/verify-user-model.cjs
pnpm --filter @interview-forge/core-api run db:verify:user
```

预期输出 `02C passed: application permissions, create/read/update, rollback`，退出码 0。需要先完成第 11 节构建；脚本有意验证最新 dist，不能使用旧产物代替。

## 13. 验证数据库真实拒绝越权和无效数据

以应用账号进入 psql，输入应用密码：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml exec postgres psql -h postgres -U forge_app -d interview_core -W
```

先执行：

```sql
SELECT current_user, current_database();

SELECT migration_name FROM core._prisma_migrations LIMIT 0;

DELETE FROM core.users WHERE false;
```

两条对象操作都应得到 permission denied。`LIMIT 0` 不读取迁移内容，`WHERE false` 不匹配用户记录，即使误配了权限，也不会在这一步删除现有用户；若它们成功，权限验收失败，先检查实际授权来源。

再手写并观察一个事务：

```sql
BEGIN;

INSERT INTO core.users (id, display_name, status, updated_at)
VALUES (gen_random_uuid(), '   ', 'ACTIVE', CURRENT_TIMESTAMP);

ROLLBACK;
```

预期 INSERT 被 `users_display_name_not_blank` 拒绝；随后执行 ROLLBACK 清理失败事务。这里的 UUID 和 updated_at 是原生 SQL 显式提供的，不能假设 Prisma 会替 psql 填值。

再检查长度限制，同样一定执行最后的 ROLLBACK：

```sql
BEGIN;

INSERT INTO core.users (id, display_name, status, updated_at)
VALUES (gen_random_uuid(), repeat('x', 81), 'ACTIVE', CURRENT_TIMESTAMP);

ROLLBACK;
```

预期因超过 VARCHAR(80) 被拒绝。这些失败是本课期望结果，不要通过删除约束或增加权限“修好”。输入 `\q` 退出。

## 14. 启动回归与 Git 文件检查

从仓库根启动构建产物：

```sh
pnpm --filter @interview-forge/core-api run start:prod
```

预期 02B 的连接/权限检查仍为 `forge_app / interview_core / true / false`。另一个终端执行：

```sh
curl -i http://127.0.0.1:3001/
```

预期默认 HTTP 200 / Hello World，结束后 Ctrl+C 停止。默认接口没有变成用户 API，也不会从这个响应推断登录已实现。

查看本次改动：

```sh
git status --short
git diff -- apps/core-api/package.json apps/core-api/prisma.config.ts apps/core-api/prisma/schema.prisma apps/core-api/.env.migration.example
git check-ignore apps/core-api/.env apps/core-api/.env.migration apps/core-api/src/generated/prisma/client.ts
```

最终应保留的练习文件：

```text
apps/core-api/.env.migration.example
apps/core-api/prisma.config.ts
apps/core-api/prisma/schema.prisma
apps/core-api/package.json
apps/core-api/prisma/migrations/migration_lock.toml
apps/core-api/prisma/migrations/<实际时间前缀>_create_users/migration.sql
apps/core-api/scripts/verify-user-model.cjs
```

时间前缀由生成命令产生，不要照抄占位目录。迁移文件和锁定文件要提交；真实环境文件、生成客户端和 dist 继续忽略。数据库角色、数据库本身不会随 Git 提交恢复，换电脑先执行本课准备步骤，再应用已有迁移；不要重新生成一份首迁移。

## 15. 完成标准与故障处理

| 检查 | 预期 | 本轮状态 |
| --- | --- | --- |
| shadow 独立账号、专用库与 core | forge_shadow / interview_core_shadow；业务账号不能连接 shadow | 待用户执行 |
| 草稿迁移审查 | 只包含 User 对象、约束、逐表授权；首次应用前整理完成 | 待用户执行 |
| deploy / status | 迁移应用成功，状态同步 | 待用户执行 |
| shadow 重放和结构比较 | db:migrate:check 退出码 0 | 待用户执行 |
| 生成、lint、类型、单测、默认 E2E、build | 全部成功 | 待用户执行 |
| 应用账号真实模型操作 | create/read/update 通过，教学记录回滚 | 待用户执行 |
| 迁移元数据、DELETE | 实际拒绝 | 待用户执行 |
| 空名称、超长名称 | 对应约束实际拒绝 | 待用户执行 |
| 02B 启动与默认 HTTP | 原有检查继续通过 | 待用户执行 |
| 其他 schema 的已有数据 | 若存在第一课探针，前后内容一致 | 待用户执行 |

常见故障按顺序定位：

| 现象 | 检查方向 |
| --- | --- |
| SHADOW_DATABASE_URL 缺失或目标校验失败 | 本地迁移环境文件、用户名、库名、schema 和端口；不打印 URL |
| P3014 或 shadow 权限错误 | 预建库所有者、shadow URL 是否真正进入配置，不能给应用账号升权 |
| create-only 提示 reset/drift | 立即取消；检查 core 中未被迁移管理的已有对象与本地迁移历史 |
| 业务库 permission denied for database | 首迁移是否仍有 CREATE SCHEMA；core 是否由管理账号预建 |
| deploy 失败 | 保留错误和历史；根据实际事务状态排查，不改成功迁移或强行标成功 |
| diff 退出 2 | 检查编辑后的迁移 SQL、业务库结构和当前配置；它不是普通成功提示 |
| user 方法不存在或旧字段报错 | 修改模型后是否重新 generate，再 build；脚本读的是 dist |
| 业务表 permission denied | SQL 中的逐表 GRANT 是否随迁移成功执行，连接账号是否为 forge_app |
| 普通 E2E 提示 EPERM/listen | 区分本地执行权限和应用断言失败；保留实际错误，不算测试通过 |

完成后反馈各项结果及去除敏感值的失败信息，我再检查实际文件并更新状态。本课完成不代表认证、对象归属授权、开发 seed、业务 HTTP API 或备份恢复完成；接下来再进入 API 基础和身份/设备会话。
