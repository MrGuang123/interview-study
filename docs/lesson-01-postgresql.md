# 手写学习 01：PostgreSQL 开发环境

日期：2026-10-22。对应 [阶段 2](stage-2-first-slice.md) 的 2.5，可与首批页面细化并行。状态：**用户已手写配置，并确认 SQL 读写及容器重建后数据保留正常，本课完成**。实际使用镜像为 `postgres:18.6-alpine`，与下方标准变体示例任选其一；现有配置见 [compose.dev.yaml](../infra/compose/compose.dev.yaml)。

示例最初在临时目录用非敏感测试值通过 `docker compose config --quiet` 校验；之后代理只读核实容器 running/healthy。SQL 与重建持久化验证由用户执行并反馈通过，代理没有代为执行 SQL 或重建容器；备份恢复与应用集成尚未验收。

目标：自己写出数据库配置，启动一个 PostgreSQL，执行 SQL，并证明容器重建后数据仍在。暂不接 Prisma、登录或其他数据库。

## 1. 学习方式

每轮按“目标 → 完整文件内容 → 关键解释 → 用户手写 → 运行和观察 → 检查与小修改”推进。目录随实际文件建立，不能只创建空文件夹，也不一次生成整个系统。需要代写、修复或自动执行时由用户明确提出。

## 2. 前置条件

本机已检查到 Docker CLI `28.5.1`、Compose `v2.40.0-desktop.1`；这只证明命令已安装，不证明 Docker 引擎正在运行。先打开 Docker Desktop，再执行：

```sh
docker --version
docker compose version
docker info --format '{{.ServerVersion}}'
```

最后一条应输出服务端版本。如果提示无法连接 daemon，先启动/检查 Docker Desktop，不继续创建容器，也不切换不明 Docker context。原生 Linux 使用正在运行的 Docker Engine，后续 Compose 内容相同。

本课选 `postgres:18.6`；核对当日，官方支持该版本且官方镜像提供该标签。使用具体版本方便复现，不需要用户自行猜版本。[镜像标签](https://hub.docker.com/_/postgres)、[PostgreSQL 版本政策](https://www.postgresql.org/support/versioning/)

## 3. 手写 Compose 配置

在已有 `infra/compose/` 下手写 **compose.dev.yaml**：

```yaml
name: interview-forge-dev

services:
  postgres:
    image: postgres:18.6
    environment:
      POSTGRES_DB: ${POSTGRES_DB:?Set POSTGRES_DB in .env}
      POSTGRES_USER: ${POSTGRES_USER:?Set POSTGRES_USER in .env}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s

volumes:
  postgres-data:
```

YAML 使用空格缩进；`services` 和底部 `volumes` 同级。`postgres-data:` 下没有值是合法的，表示使用默认命名卷配置。

| 配置 | 要理解的作用 |
| --- | --- |
| name | Compose 项目名，形成稳定的容器/网络/卷命名范围 |
| services.postgres | 服务名；后续容器之间可用它寻找数据库，本机 Nest 则使用映射端口 |
| image | PostgreSQL 运行镜像；启动的容器是镜像的运行实例 |
| environment | 把初始化所需变量传给容器；`${VAR:?…}` 在变量缺失/为空时拒绝继续 |
| ports | 本机 127.0.0.1 的可配置端口转发到容器 5432，仅发布在本机回环地址 |
| volumes | 命名卷保存数据，使容器和数据生命周期分开 |
| healthcheck | 在容器里用 pg_isready 检查是否接受连接；它不证明业务表、迁移或密码验证已正确 |
| $$ | 避免 Compose 提前替换，让容器中的 shell 再展开 POSTGRES_USER/DB |

PostgreSQL 18 官方镜像的卷挂载位置为 `/var/lib/postgresql`；不要把旧版本教程的 `/var/lib/postgresql/data` 原样套到本课。[官方镜像数据目录说明](https://hub.docker.com/_/postgres)

这里的 POSTGRES_USER 是初始化管理账号，会被创建为超级用户。本课只用于本机教学验证；接入 Nest 前再建立受限应用账号及明确的迁移权限，不将初始化管理账号作为正式应用账号。

## 4. 手写环境示例，准备本地值

同目录手写 **.env.example**：

```dotenv
POSTGRES_DB=interview_core
POSTGRES_USER=forge_bootstrap
POSTGRES_PASSWORD=
POSTGRES_PORT=5432
```

从项目根进入该目录：

```sh
cd infra/compose
cp .env.example .env
```

仅在本地 `.env` 为 POSTGRES_PASSWORD 填一个开发密码，示例文件保持空密码。根忽略规则已忽略 `.env` 并保留 `.env.example`；不需要把密码发给 Codex。

`.env` 提供 Compose 插值，本例通过 `environment` 明确传入容器；两者不是同一个动作。显式 `--env-file` 避免因为工作目录变化读取错文件。[Docker 插值规则](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)

## 5. 检查、启动、观察

以下命令都在 `infra/compose/` 执行：

```sh
docker compose --env-file .env -f compose.dev.yaml config --quiet
docker compose --env-file .env -f compose.dev.yaml up -d --wait postgres
docker compose --env-file .env -f compose.dev.yaml ps
```

第一条检查通过时没有输出，且退出码为 0。使用 `--quiet` 避免把展开后的密码打印在终端。第二条首次会下载镜像，然后等待运行/健康；第三条应看到 postgres 为 running/Up 且 healthy，主机映射形如 `127.0.0.1:5432->5432/tcp`。[启动与等待说明](https://docs.docker.com/reference/cli/docker/compose/up/)

初始化较慢时可查看：

```sh
docker compose --env-file .env -f compose.dev.yaml logs --tail 50 postgres
```

如果主机 5432 已被占用，只改本地 `.env` 的 POSTGRES_PORT，例如 5433，再重新启动。容器里的端口仍为 5432；后续本机 Nest 连接地址使用新的主机端口。

## 6. 登录并执行一小段 SQL

运行：

```sh
docker compose --env-file .env -f compose.dev.yaml exec postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

这会在容器中用本地环境里的账号密码连接数据库，不需要本机另装 psql。这里 `-h 127.0.0.1` 指容器自身的 TCP 接口；它不单独证明主机映射端口可被 Nest 使用，接 Prisma 时还要验证那条路径。命令不打印密码，但有本机 Docker 管理权的人仍能访问容器环境；此配置仅用于开发。

出现 psql 提示符后手写：

```sql
CREATE SCHEMA IF NOT EXISTS learning_probe;

CREATE TABLE IF NOT EXISTS learning_probe.persistence_check (
  id integer PRIMARY KEY,
  note text NOT NULL
);

INSERT INTO learning_probe.persistence_check (id, note)
VALUES (1, 'my first persistent row')
ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note;

SELECT id, note FROM learning_probe.persistence_check;
```

应看到 id 为 1、note 为 `my first persistent row` 的一行。schema 是数据库内的命名空间，PRIMARY KEY 确定唯一记录，NOT NULL 禁止空值，ON CONFLICT 让这段教学插入可重复执行。

这是独立 schema 中的教学探针，不是正式题库或回答模型。下一课的业务表由迁移管理，不用手工建业务表代替迁移。

输入以下 psql 命令退出：

```text
\q
```

## 7. 证明数据不跟着容器消失

仍在 `infra/compose/` 执行：

```sh
docker compose --env-file .env -f compose.dev.yaml down
docker compose --env-file .env -f compose.dev.yaml up -d --wait postgres
```

再用第 6 节的连接命令进入 psql，仅执行 SELECT，不重新 CREATE/INSERT：

```sql
SELECT id, note FROM learning_probe.persistence_check;
```

仍能读取原来那一行，才证明这次容器删除/重建后命名卷保留了数据。日常停止使用 down，不加 `-v`；`down -v` 会移除该项目的命名卷。此验证不是独立备份，不能据此声称可以恢复磁盘或主机损坏。

POSTGRES_DB/USER/PASSWORD 用于空数据目录的首次初始化；已有卷时修改 `.env` 不会自动改数据库中的账号或密码。遇到不一致先检查原因，不用删除卷解决所有连接问题。

## 8. 这一轮写完后的反馈

完成后告诉 Codex“第一课写好了，检查一下”，并说明做到哪一步。如果出错，只提供失败命令及已脱敏错误信息。Codex 从仓库检查你写的 Compose 和示例文件，不读取或打印真实 `.env`，不在你不知情时重置数据库。

本课完成标准是：能解释镜像/容器/卷/端口/环境变量/健康检查；服务健康，SQL 可运行，重建后探针记录仍在。文档给出代码不算用户已经完成。后续第一步是受限账号、core-api 配置与 Prisma 实际接入。
