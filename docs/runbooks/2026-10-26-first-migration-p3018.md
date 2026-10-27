# 2026-10-26：首迁移缺少逗号导致 P3018

## 当前证据与范围

用户执行 `db:migrate:deploy`，报告迁移 `20261026092106_create_users` 以 Prisma P3018 / PostgreSQL 42601 失败。本轮代理只读核对实际 SQL：第 14 行主键约束末尾缺逗号，紧接第二个 CONSTRAINT；文件包含 BEGIN / COMMIT，其他业务 DDL 和授权也在其中。

本记录初版提供用户手动恢复步骤；当时代理尚未检查实际数据库是否回滚，也未执行修正、resolve、deploy 或其他数据库操作。不能将恢复方案的存在记录为恢复通过。

2026-10-27 更新：用户确认 02C 已完成，代理只读核对到迁移逗号已修正；未查询数据库或逐项复验恢复命令。课程按用户反馈完成，以下保留故障处理方法，成功应用后不重复执行这些恢复步骤。

## 1. 手动修正失败 SQL

文件：`apps/core-api/prisma/migrations/20261026092106_create_users/migration.sql`。

将两条约束整理为：

```sql
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_display_name_not_blank"
      CHECK (char_length(btrim("display_name")) > 0)
```

同一 CREATE TABLE 中的字段、表级约束之间用逗号分隔；最后一项后面不加逗号。这份迁移执行失败，尚未成功应用，允许修正根因再重试；不是修改一份成功应用的历史迁移。

## 2. 先检查真实业务库，无残留再继续

从仓库根连接迁移账号，交互输入该账号密码：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml exec postgres psql -h postgres -U forge_migrator -d interview_core -W
```

执行只读查询：

```sql
SELECT current_user, current_database();

SELECT
  to_regclass('core.users') IS NULL AS users_absent,
  to_regtype('core.user_status') IS NULL AS status_type_absent;

SELECT migration_name, finished_at, rolled_back_at
FROM core._prisma_migrations
WHERE migration_name = '20261026092106_create_users'
ORDER BY started_at DESC;
```

当前连接必须为 `forge_migrator / interview_core`。本次有事务包裹且为语法错误，预期两项 absent 都为 true；失败尝试的 finished_at / rolled_back_at 通常均为 NULL。

**只有确认两个业务对象均不存在，才进入下一步。** 若任一 absent 为 false，先核对对象和失败记录来源，不删除对象，也不直接标记回滚。

输入 `\q` 返回终端。

## 3. 标记失败尝试已回滚，再重新执行

在第 2 步确认无残留后，从仓库根执行：

```sh
pnpm --filter @interview-forge/core-api exec prisma migrate resolve --rolled-back 20261026092106_create_users
pnpm --filter @interview-forge/core-api run db:migrate:deploy
pnpm --filter @interview-forge/core-api run db:migrate:status
pnpm --filter @interview-forge/core-api run db:migrate:check
```

`resolve --rolled-back` 只更新迁移历史，让失败的迁移可以重新执行；它不回滚 SQL、不清理残留对象，也不执行修正后的建表语句。因此必须先核对数据库真实状态。不要使用 `--applied` 跳过尚未成功执行的 SQL。[Prisma 失败迁移恢复](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing#option-1-mark-the-migration-as-rolled-back-and-re-deploy)、[resolve 命令](https://www.prisma.io/docs/cli/v7/migrate/resolve)

失败记录可以保留；重试后会记录新的成功尝试，不需要手动删除 `_prisma_migrations` 中的旧记录。

## 4. 成功判定与后续

- resolve 成功标记指定失败迁移；deploy 成功应用同名迁移。
- status 显示迁移同步；check 完整重放编辑后的 SQL，无结构差异，退出码 0。
- 再继续 [02C 第 11 节及之后](../lesson-02c-first-migration.md)：生成客户端、检查/构建、真实读写与约束验收。

如果还有错误，保留完整命令及去除凭据后的报错。本次恢复不需要 reset、删除数据卷或重新生成首迁移；未成功恢复前，不更新本课为完成。
