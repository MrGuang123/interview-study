# 手写学习 03A：存活与数据库就绪检查

提供日期：2026-10-27。状态更新：**2026-10-28 用户确认本课已完成**。健康模块、AppModule 接入与 HTTP 测试均已提交；代理本轮未重跑真实数据库停机/恢复。以下保留完整教学步骤，下一课见 [03B：请求标识、请求日志与统一错误响应](lesson-03b-request-errors.md)。

本课交付一个小目标：新增两个健康检查接口，亲手验证“进程还能响应”和“当前能访问业务表”的区别。它对应 [阶段 2 清单](stage-2-first-slice.md) 的 2.7；后续再逐课加入请求标识、错误契约、输入校验和身份会话。

沿用现有 Nest、Prisma 7、CommonJS 和无扩展名相对导入，使用现有依赖与脚本。终端命令都从仓库根执行：

```sh
cd /Users/ytg/Documents/study/interview-study
```

教程预核验：2026-10-27，代理将下文 5 段 TypeScript 原样提取到临时应用副本，使用当时安装依赖，通过 lint、类型检查、构建、1 个默认单测及 5 个 HTTP 测试。HTTP 测试首次受沙箱本机监听限制，允许监听后通过；全程使用 Prisma 替身，未连接数据库。这份历史预核验只证明当时的教程示例；本课实际完成按 2026-10-28 用户反馈与已提交文件记录。

## 1. 先固定接口行为

| 请求 | 检查什么 | 成功 | 失败 |
| --- | --- | --- | --- |
| GET /health/live | 进程能否处理这个 HTTP 请求，不查询数据库 | 200，`{"status":"alive"}` | 进程未监听时无法连接 |
| GET /health/ready | 以应用账号读取 core.users 的最少字段 | 200，`{"status":"ready"}` | 查询失败时 503，`{"status":"not_ready"}` |

两个接口都返回 `Cache-Control: no-store`，避免缓存旧状态。就绪检查只读取、不创建数据，也不返回用户记录、数据库地址或原始错误。这里的健康状态是本课的小型运维契约，后续业务错误格式另课建立。

现有 `main.ts` 在监听前连接数据库并检查账号。保留这一行为：数据库一开始就不可用时，应用启动失败，两个接口都不可访问。本课的停机演练是 **先成功启动 API，再停止数据库**；此时应出现 live 仍然 200、ready 变成 503。

## 2. 手写 HealthService

新建 `apps/core-api/src/health/health.service.ts`，完整内容：

```ts
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async checkReady(): Promise<{ status: 'ready' }> {
    try {
      await this.prisma.user.findFirst({
        select: { id: true },
      });
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready' });
    }

    return { status: 'ready' };
  }
}
```

`@Injectable()` 让 Nest 管理这个 Service；`@Inject(PrismaService)` 明确指定注入令牌，不自行 `new PrismaService()`，连接池和关闭流程继续由现有 Provider 管理。显式令牌也避免测试转译工具未输出构造参数类型元数据时无法推断依赖。

`findFirst` 最多取得一条记录，只选择 `id`。空表返回 `null`，仍表示查询成功，不要求先插入用户。这个探针比 `SELECT 1` 多检查了 User 对应表和读取权限；它不证明 INSERT/UPDATE 权限、全部表结构或全部业务流程都正常。[Prisma 查询说明](https://www.prisma.io/docs/orm/v7/prisma-client/queries/crud)

`await` 必须留在 `try` 内，才能捕获异步查询失败。503 表示此刻未就绪；传入固定对象使客户端只看到约定状态，不包含 Prisma 原始错误。本课只在探针边界转换查询失败，不将这段 catch 当作所有业务错误的处理模板。[Nest 异常处理](https://docs.nestjs.com/exception-filters)

## 3. 手写 HealthController

新建 `apps/core-api/src/health/health.controller.ts`：

```ts
import { Controller, Get, Header, Inject } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  live(): { status: 'alive' } {
    return { status: 'alive' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  ready(): Promise<{ status: 'ready' }> {
    return this.healthService.checkReady();
  }
}
```

Controller 负责路径和 HTTP 响应元数据，Service 负责检查。`health` 与方法上的路径拼成 `/health/live`、`/health/ready`；返回普通对象由 Nest 序列化成 JSON。live 不调用 Service 查询，数据库故障时才能继续响应。[Nest Controller 与响应头](https://docs.nestjs.com/controllers)

## 4. 手写模块并接入 AppModule

新建 `apps/core-api/src/health/health.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

`DatabaseModule` 已导出 PrismaService；HealthModule 必须显式导入它，才能注入该 Provider。无需把数据库模块改成全局，也不用再次在 providers 中注册 PrismaService。

修改 `apps/core-api/src/app.module.ts`，完整内容如下。当前文件的 `./app.service.js` 也一并改成约定的 `./app.service`：

```ts
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
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

依赖路径为：HTTP → HealthController → HealthService → 当前 core-api 的 PrismaService → PostgreSQL。main.ts、数据库模型与迁移无需调整。

## 5. 手写 HTTP 行为测试

新建 `apps/core-api/test/health.e2e-spec.ts`，保留已有 `app.e2e-spec.ts`：

```ts
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  const findFirst = vi.fn();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { findFirst } })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    findFirst.mockReset();
    findFirst.mockResolvedValue(null);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('live stays available without querying the database', async () => {
    findFirst.mockRejectedValue(new Error('03A_INTERNAL_PROBE_FAILURE'));

    await request(app.getHttpServer())
      .get('/health/live')
      .expect('Cache-Control', 'no-store')
      .expect(200)
      .expect({ status: 'alive' });

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('ready accepts an empty users table', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect('Cache-Control', 'no-store')
      .expect(200)
      .expect({ status: 'ready' });

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('ready returns status without exposing a user record', async () => {
    findFirst.mockResolvedValue({ id: '03A_TEST_USER_ID' });

    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ready' });
  });

  it('ready hides the database error and can recover', async () => {
    findFirst.mockRejectedValueOnce(new Error('03A_INTERNAL_PROBE_FAILURE'));

    await request(app.getHttpServer())
      .get('/health/ready')
      .expect('Cache-Control', 'no-store')
      .expect(503)
      .expect({ status: 'not_ready' });

    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ready' });
  });
});
```

替换 Prisma Provider 后，测试不需要数据库密码或真实连接；四个用例检查 HTTP 状态、空表、响应脱敏、live 不访问数据库以及失败后可再次探测。精确匹配响应对象也会发现意外返回的用户字段或错误详情。这是 HTTP 行为测试，不能证明真实 PostgreSQL 停机/恢复。[Nest 测试与 Provider 替换](https://docs.nestjs.com/fundamentals/testing)

## 6. 检查、构建并启动

完成上述 5 个文件后，从仓库根执行已有脚本：

```sh
pnpm --filter @interview-forge/core-api run lint
pnpm --filter @interview-forge/core-api exec tsc --noEmit --incremental false
pnpm --filter @interview-forge/core-api run test
pnpm --filter @interview-forge/core-api run test:e2e
pnpm --filter @interview-forge/core-api run build
```

预期 lint、类型与构建成功；现有默认单测 1 个，E2E 合计 5 个（原默认 1 个 + 本课 4 个）。生成客户端缺失时先执行现有 `db:generate`；不需要重新生成或修改首迁移。

确认 PostgreSQL 正在运行，再启动刚构建的产物：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml ps
NODE_ENV=test PORT=3001 pnpm --filter @interview-forge/core-api run start:prod
```

这里的 `NODE_ENV=test` 只利用现有开关停用 Observe，启动 main.ts 时仍使用真实 PrismaService；测试中的 Provider 替身不会进入这个进程。验收完成后 Ctrl+C 停止。

另一个终端检查：

```sh
curl --max-time 15 -i http://127.0.0.1:3001/
curl --max-time 15 -i http://127.0.0.1:3001/health/live
curl --max-time 15 -i http://127.0.0.1:3001/health/ready
```

预期根接口仍为 200 / Hello World；live 与 ready 为第 1 节的 200 响应，并带 `Cache-Control: no-store`。

## 7. 亲手演练运行中断库与恢复

只在当前开发数据库上演练，保持 API 进程运行。在第二个终端停止 PostgreSQL 服务：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml stop postgres
curl --max-time 15 -i http://127.0.0.1:3001/health/live
curl --max-time 15 -i http://127.0.0.1:3001/health/ready
```

预期 live 仍返回 200 / alive；ready 返回 503 / not_ready。HTTP 503 是本次期望结果；连接拒绝或 curl 超时不能替代 503 验收，需分别检查 API 是否退出、监听端口与数据库连接池行为。

然后恢复现有容器：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml start postgres
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml ps
```

等待显示 healthy 后，不重启 API，重新请求：

```sh
curl --max-time 15 -i http://127.0.0.1:3001/health/ready
```

预期回到 200 / ready。记录这三段响应和 API 是否一直运行；若失败，恢复 PostgreSQL 后再排查。本课无需删卷、删表、改权限或写入探针用户。

## 8. 本课边界与验收反馈

当前 Prisma Provider 的 `connectionTimeoutMillis: 5000` 是连接/连接池等待设置，不代表任意 SQL 都会在 5 秒内结束；curl 的 15 秒也只是客户端等待上限。本课尚未建立完整查询截止时间、探针限流或部署探针配置，不能承诺故障响应时间，也不用只停止等待、不取消查询的 Promise.race 伪装数据库超时。

健康响应只描述当前进程和最小读取能力。后续增加依赖、业务表和部署时，再决定必要检查、数据库侧超时与专用健康检查组件。认证课还要处理健康路径与受保护业务路径的访问策略。

| 验收项 | 完成标准 |
| --- | --- |
| 文件与模块 | 3 个 health 源文件、AppModule 修改、1 个新 E2E 文件；相对导入无扩展名 |
| 静态与自动检查 | lint、类型、1 个默认单测、5 个 E2E、构建全部通过 |
| 数据库正常 | 根接口回归成功；live / ready 均 200 |
| 运行中数据库停止 | API 继续运行；live 200，ready 503 且响应不含内部错误 |
| 数据库恢复 | 不重启 API，ready 恢复 200 |

本课已按用户反馈记录完成，接下来进入 [03B 的请求标识与错误契约](lesson-03b-request-errors.md)。公开用户 API、登录、设备会话与对象授权仍留在后续课实现。
