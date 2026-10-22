# 手写学习 02A：数据库账号与权限

日期：2026-10-22。状态：**教学内容已提供；角色、权限和验收等待用户执行**。上一课的 SQL 读写与容器重建后数据保留由用户执行并反馈通过；本轮没有替用户执行 SQL，也未安装 Prisma。

本小节只做账号和 schema。下一小节再接 core-api、Prisma 和迁移。不要一次创建完整业务模块。

## 1. 为什么需要三个账号

| 数据库账号 | 用途 | 边界 |
| --- | --- | --- |
| forge_bootstrap | 上一课的初始化管理账号，创建角色与授权 | 不作为 Nest 日常连接账号 |
| forge_migrator | 后续执行本服务的结构迁移 | 拥有 core schema，可在其中改变结构；不授予超级用户或 CREATEDB |
| forge_app | 后续 Nest 运行时连接数据库 | 获得 core schema 的使用权；具体业务表出现后再逐表授予所需读写权限，不拥有建表权限 |

数据库账号和网站账号不同：未来多个学习者登录网站，Nest 可以使用同一个 forge_app 访问本服务数据，但仍须根据请求身份校验回答归属。数据库角色分离不会自动实现网站的用户权限。

角色是 PostgreSQL 实例级对象；schema 是某个数据库内的命名空间。这里的 core 是 interview_core 数据库内的 schema，不是新的数据库。[角色说明](https://www.postgresql.org/docs/18/sql-createrole.html)

## 2. 以现有管理账号连接

以下终端命令均在 `infra/compose/` 执行，SQL 在进入 psql 后执行：

```sh
docker compose --env-file .env -f compose.dev.yaml exec postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

先执行：

```sql
SELECT current_user, current_database();
```

预期用户为 forge_bootstrap，数据库为 interview_core。若你此前自定义了数据库名，需要对应修改本课 SQL 中的数据库名，不能在错误的数据库中继续操作。

## 3. 创建迁移账号和应用账号

手写以下 SQL，一条一条执行：

```sql
CREATE ROLE forge_migrator
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

CREATE ROLE forge_app
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;
```

LOGIN 允许登录；其余 NO… 明确不授予超级用户、建库、管理角色、复制和绕过行级安全的能力。没有配置 RLS 时，NOBYPASSRLS 本身不构成业务行权限实现。

角色刚创建时还没有密码。使用 psql 的交互命令设置两个不同的本地开发密码：

```text
\password forge_migrator
\password forge_app
```

每个命令会让你输入并确认密码，输入通常不显示字符。不要在回答、SQL 文件或聊天中粘贴真实密码，也不用改 Compose 的 POSTGRES_USER/PASSWORD；Compose 保留初始化管理账号。`\password` 不加 SQL 分号。[psql 密码命令](https://www.postgresql.org/docs/18/app-psql.html)

CREATE ROLE 不是可重复初始化脚本。若提示角色已存在，先用 `\du` 检查状态；不要删除角色或数据卷，也不要为跳过报错改用超级用户运行应用。

## 4. 建立 core schema 并授权

仍以管理账号在 interview_core 中执行：

```sql
CREATE SCHEMA core AUTHORIZATION forge_migrator;

REVOKE ALL ON SCHEMA core FROM PUBLIC;

GRANT CONNECT ON DATABASE interview_core
TO forge_migrator, forge_app;

GRANT USAGE ON SCHEMA core TO forge_app;
```

理解四个动作：

- AUTHORIZATION 将 core schema 的所有权交给迁移账号，而非应用账号。
- PUBLIC 是所有角色的集合；此处不是名为 public 的 schema。撤回该 schema 的公共权限，不会删除任何表。
- CONNECT 允许连接该数据库；它不代表自动获得里面所有对象的访问权。
- USAGE 允许访问 schema 中已获授权的对象，但不授予 CREATE 或表的读写权限。

数据库、schema、表和序列分别有权限。本课没有创建正式业务表，也没有给 forge_app 任何全 schema 的默认 DML 权限；后续业务迁移按具体表授权，并把 ORM 迁移元数据与业务表区分。[GRANT 说明](https://www.postgresql.org/docs/18/sql-grant.html)

本轮不更改全局 search_path，SQL 都写完整的 core.表名，便于看清对象位置。角色的其他数据库连接策略与未来其他服务的账号隔离尚未配置；不能把本课描述为全实例权限隔离完成。

## 5. 验证应用账号真实登录与权限

先输入 `\q` 返回终端，再用应用账号登录：

```sh
docker compose --env-file .env -f compose.dev.yaml exec postgres psql -h 127.0.0.1 -U forge_app -d interview_core -W
```

输入刚才为 forge_app 设置的密码。`-W` 要求交互输入密码，`-h 127.0.0.1` 让连接使用容器内的 TCP 密码认证；不要只用管理账号 SET ROLE 来代替密码登录验收。

进入后执行：

```sql
SELECT current_user, current_database();

SELECT
  has_schema_privilege(current_user, 'core', 'USAGE') AS can_use_schema,
  has_schema_privilege(current_user, 'core', 'CREATE') AS can_create_table;
```

预期当前用户为 forge_app，两个权限结果依次为 t/true 和 f/false。

再验证一次实际拒绝：

```sql
CREATE TABLE core.permission_probe (id integer PRIMARY KEY);
```

应得到 `permission denied for schema core`。这是本课期望的权限结果，不需要为消除错误给应用补 CREATE。如果竟然创建成功，先停下检查角色和 schema 所有权。

## 6. 验证迁移账号可以建表

输入 `\q` 返回终端，用迁移账号登录：

```sh
docker compose --env-file .env -f compose.dev.yaml exec postgres psql -h 127.0.0.1 -U forge_migrator -d interview_core -W
```

输入迁移账号的密码，再执行：

```sql
SELECT current_user, current_database();

CREATE TABLE core.permission_probe (id integer PRIMARY KEY);

DROP TABLE core.permission_probe;
```

CREATE TABLE 和 DROP TABLE 都应成功。此表只用于本节权限探针，明确创建后立即删除；不是正式业务表，也不影响上一课 learning_probe 中的记录。正式业务表由迁移文件管理。

最后可输入 `\q` 返回终端。本轮到这里停止，不提前安装 ORM 或把应用连接到管理账号。

## 7. 进入下一小节前的检查

| 检查项 | 结果 |
| --- | --- |
| forge_migrator 和 forge_app 都能分别用密码登录 | 用户执行后反馈 |
| 应用账号 USAGE 为真、CREATE 为假 | 用户执行后反馈 |
| 应用账号在 core 建表被拒绝 | 用户执行后反馈 |
| 迁移账号能建/删指定的教学探针表 | 用户执行后反馈 |
| 实际角色、授权和连接已执行 | 当前尚未完成，不能从本文存在推断 |

下一小节按 [02B：core-api 接入 Prisma 7](lesson-02b-prisma-connection.md) 手写安装、生成配置、core-api 运行连接、迁移连接与实际验证。运行时只使用应用账号；正式模型与迁移安排在 02C。若开发迁移需要 shadow 数据库，由管理账号预建独立的专用数据库并单独配置，不能使用真实业务库充当 shadow，也不临时将应用账号提升为超级用户。

默认权限是后续迁移中需要解释的另一层：它只影响指定创建者未来创建的对象，并不修改已有表权限。本课先不启用整 schema 的自动表授权，避免尚未区分业务表和迁移元数据就统一赋权。[默认权限说明](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html)
