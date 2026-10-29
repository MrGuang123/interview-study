# 手写学习 03B：请求标识、请求日志与统一错误响应

日期：2026-10-28。状态：**教学步骤已提供，等待用户手写和执行**。03A 已按用户反馈记录完成；本轮只维护文档，并在临时副本验证教程，不代写练习源码或操作数据库。

本课只完成一条排障链路：请求进入 → 服务器生成 requestId → 响应携带 requestId → 失败返回受控错误 → 用同一个 requestId 找到请求完成日志。对应 [阶段 2 清单](stage-2-first-slice.md) 的 2.7；运行时字段校验、业务错误码、认证与设备会话仍在后续课实现。

沿用你当前的 CommonJS 输出、无扩展名相对导入和现有依赖。本课不要求修改 package.json、tsconfig、Prisma 或环境文件，也不重新选择模块格式。终端命令从仓库根执行：

```sh
cd /Users/ytg/Documents/study/interview-study
```

教程预核验：2026-10-28，将下文 5 段 TypeScript 原样提取到当前应用的临时副本，使用现有依赖通过 lint、类型检查、构建、1 个默认单测和 12 个 HTTP E2E。允许本机端口监听后，HTTP 测试以 Prisma 替身执行；还验证了 Node 可直接 require 编译后的 AppModule 和请求上下文模块。未连接真实数据库、启动真实业务应用或修改仓库练习源码，不将临时副本通过记成用户已完成 03B。

## 1. 先明确本课行为

| 场景 | HTTP 行为 |
| --- | --- |
| 成功请求 | 原成功 body 保留，新增 X-Request-Id 响应头 |
| 未知路由 | 404；返回固定 code/message/requestId，不回显 URL |
| 普通 HTTP 异常 | 保留合法错误状态码；使用标准状态说明，不透传 exception.message 或任意错误 body |
| 未知异常 | 500 / INTERNAL_ERROR，不返回原始错误或堆栈 |
| 03A 的已知 ready 失败 | 仍为 503 / `{"status":"not_ready"}`，请求 ID 放在响应头与日志中 |
| 客户端提交 X-Request-Id | 本课忽略它，由服务器独立生成 UUID |

例如普通 404 响应：

```json
{
  "code": "HTTP_404",
  "message": "Not Found",
  "requestId": "本次请求的服务器 UUID"
}
```

`requestId` 用于关联一次 HTTP 请求；它不是用户身份、幂等键，也不是完整分布式 trace。重试会产生新的 requestId，业务操作去重所需的 operationId 另行设计。不要把“客户端知道请求 ID”当作授权。

## 2. 手写请求上下文与完成日志

新建 `apps/core-api/src/common/http/request-context.ts`，完整内容：

```ts
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ConsoleLogger } from '@nestjs/common';
import type { Request, Response } from 'express';

export type HttpResponse = Response<
  unknown,
  { requestId?: string; errorCode?: string }
>;

const logger = new ConsoleLogger('HttpRequest', { json: true });

export function ensureRequestContext(
  request: Request,
  response: HttpResponse,
): string {
  const existing = response.locals.requestId;
  if (existing) {
    return existing;
  }

  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  const startedAt = performance.now();

  response.once('finish', () => {
    const route = request.route as { path?: unknown } | undefined;

    logger.log({
      event: 'http.request.completed',
      requestId,
      method: request.method,
      route: typeof route?.path === 'string' ? route.path : 'unmatched',
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      errorCode: response.locals.errorCode,
    });
  });

  return requestId;
}
```

`response.locals` 是本次响应自己的上下文。每次请求的 ID 和错误分类保存在这里，不放进共享 Service 的可变属性；顶部共享的 logger 只保存日志配置。函数重复调用时返回已有 ID，因此中间件和异常过滤器不会给同一请求生成两套 ID 或重复注册完成日志。

`finish` 表示服务器已完成响应写出；此时读取最终状态码。它不证明客户端已收到全部内容，也不覆盖中途断开连接的请求。`durationMs` 从本函数首次执行时开始计算，不是包含代理、网络和全部解析阶段的端到端耗时。

日志使用字段白名单，只记录事件、请求 ID、方法、**服务端路由模板**、状态、耗时与错误分类。不记录原始 URL、动态路径实参、query、Cookie、Authorization、body、异常 message 或堆栈；没有路由模板时使用固定值。未知路由也可能留下全路径中间件的通配模板，它仍是服务器定义的常量，不回退到用户输入的 path。

`ConsoleLogger` 的 `json: true` 让这类 HTTP 完成日志以 JSON 输出，业务字段通常位于日志的 `message` 对象中；现有启动日志仍沿用原配置。这一步没有完成全应用日志改造、日志平台接入或跨服务追踪。[Nest 日志说明](https://docs.nestjs.com/application/logger)

## 3. 手写中间件

新建 `apps/core-api/src/common/http/request-context.middleware.ts`：

```ts
import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request } from 'express';
import { ensureRequestContext } from './request-context';
import type { HttpResponse } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: HttpResponse, next: NextFunction): void {
    ensureRequestContext(request, response);
    next();
  }
}
```

中间件在路由处理前建立上下文，`next()` 继续执行后续链路。`import type` 只引用接口类型；`Injectable` 与函数需要在运行时使用，保留普通 import。这里的 X-Request-Id 是**响应头**，没有从客户端请求头取值。[Nest 中间件](https://docs.nestjs.com/middleware)

## 4. 手写 HTTP 异常过滤器

新建 `apps/core-api/src/common/http/http-exception.filter.ts`：

```ts
import { STATUS_CODES } from 'node:http';
import {
  Catch,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request } from 'express';
import { ensureRequestContext } from './request-context';
import type { HttpResponse } from './request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<HttpResponse>();

    if (response.headersSent) {
      response.end();
      return;
    }

    const requestId = ensureRequestContext(request, response);
    const candidate = exception instanceof HttpException
      ? exception.getStatus()
      : 500;
    const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
      ? candidate
      : 500;
    const code = status === 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;

    response.locals.errorCode = code;
    response.setHeader('Cache-Control', 'no-store');

    const route = request.route as { path?: unknown } | undefined;
    if (
      request.method === 'GET' &&
      route?.path === '/health/ready' &&
      exception instanceof ServiceUnavailableException
    ) {
      response.status(503).json({ status: 'not_ready' });
      return;
    }

    response.status(status).json({
      code,
      message: STATUS_CODES[status] ?? 'Request failed',
      requestId,
    });
  }
}
```

`@Catch()` 使过滤器接收未处理异常；`unknown` 要先经过类型判断，才能调用异常方法。普通错误统一变为 500；已知 HttpException 保留合法 4xx/5xx 状态，但不直接转发它携带的 message、数据库错误或任意对象。`HTTP_400` 等是本课的 HTTP 基础分类，后续业务模块再设计具体错误码和允许公开的字段错误。[Nest 异常过滤器](https://docs.nestjs.com/exception-filters)

03A 的 ready 故障是已完成的运维契约，因此只对匹配到 `GET /health/ready` 的 ServiceUnavailableException 返回原固定 body。它仍有请求 ID 和完成日志；未知的 `/health/...` 路径仍走普通 404，其他错误也不借健康路径绕过过滤器。后续修改健康路由时需要同步这项兼容规则和回归测试。

错误可能出现在模块中间件执行前，例如 JSON 解析失败。过滤器会补建请求上下文；因此这类错误也有 ID 与完成日志，但耗时起点是补建上下文的时刻。启动失败、后台任务、GraphQL、WebSocket 和已开始流式输出的错误不属于本课这套普通 HTTP JSON 契约。

## 5. 在 AppModule 注册真实链路

修改 `apps/core-api/src/app.module.ts`，完整内容：

```ts
import { Module, RequestMethod } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/http/http-exception.filter';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
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
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      path: '{*path}',
      method: RequestMethod.ALL,
    });
  }
}
```

`{*path}` 是当前 Express 5 链路能包含根路径的命名通配写法；本课必须同时验证 `/`、健康路由和未知路由。`APP_FILTER` 注册全局过滤器，模块的 configure 注册中间件。[中间件路由匹配](https://docs.nestjs.com/middleware#route-wildcards)

这些装配放在 AppModule，现有 `Test.createTestingModule({ imports: [AppModule] })` 也会执行它们；若只写进 main.ts，当前 HTTP 测试不会覆盖那段启动装配。本课 main.ts 和三个 health 文件保持现有内容。

## 6. 手写 HTTP 契约测试

新建 `apps/core-api/test/http-contract.e2e-spec.ts`，保留已有两个 E2E 文件：

```ts
import { BadRequestException, ConsoleLogger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module';
import { AppService } from '../src/app.service';
import { PrismaService } from '../src/database/prisma.service';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('HTTP request contract (e2e)', () => {
  let app: INestApplication<App>;
  const findFirst = vi.fn();
  const messages: unknown[] = [];

  function logsFor(requestId: string): Record<string, unknown>[] {
    return messages.filter((entry): entry is Record<string, unknown> => {
      if (typeof entry !== 'object' || entry === null) {
        return false;
      }
      const row = entry as Record<string, unknown>;
      return row.event === 'http.request.completed' && row.requestId === requestId;
    });
  }

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
    messages.length = 0;
    vi.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(
      (message: unknown, ...rest: unknown[]) => {
        messages.push(message, ...rest);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('keeps success body and generates its own ID without logging private inputs', async () => {
    const response = await request(app.getHttpServer())
      .get('/?token=03B_PRIVATE_QUERY')
      .set('Cookie', 'session=03B_PRIVATE_COOKIE')
      .set('Authorization', 'Bearer 03B_PRIVATE_TOKEN')
      .set('X-Request-Id', '03B_CLIENT_ID')
      .expect('X-Request-Id', uuidV4)
      .expect(200)
      .expect('Hello World!');

    const id = response.headers['x-request-id'] as string;
    expect(id).not.toBe('03B_CLIENT_ID');
    expect(logsFor(id)).toHaveLength(1);
    expect(logsFor(id)[0]).toMatchObject({ method: 'GET', statusCode: 200 });
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('links a 404 response to one completion log without exposing the URL', async () => {
    const response = await request(app.getHttpServer())
      .get('/03b-missing/03B_PRIVATE_PATH?token=03B_PRIVATE_QUERY')
      .expect('X-Request-Id', uuidV4)
      .expect('Cache-Control', 'no-store')
      .expect(404);

    const id = response.headers['x-request-id'] as string;
    expect(response.body).toEqual({
      code: 'HTTP_404', message: 'Not Found', requestId: id,
    });
    expect(logsFor(id)).toHaveLength(1);
    expect(logsFor(id)[0]).toMatchObject({ statusCode: 404, errorCode: 'HTTP_404' });
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('sanitizes an unexpected error', async () => {
    vi.spyOn(app.get(AppService), 'getHello').mockImplementation(() => {
      throw new Error('03B_PRIVATE_EXCEPTION');
    });

    const response = await request(app.getHttpServer())
      .get('/')
      .expect('X-Request-Id', uuidV4)
      .expect(500);

    const id = response.headers['x-request-id'] as string;
    expect(response.body).toEqual({
      code: 'INTERNAL_ERROR', message: 'Internal Server Error', requestId: id,
    });
    expect(logsFor(id)).toHaveLength(1);
    expect(logsFor(id)[0]).toMatchObject({ statusCode: 500, errorCode: 'INTERNAL_ERROR' });
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('does not forward arbitrary HttpException messages', async () => {
    vi.spyOn(app.get(AppService), 'getHello').mockImplementation(() => {
      throw new BadRequestException('03B_PRIVATE_VALIDATION_MESSAGE');
    });

    const response = await request(app.getHttpServer())
      .get('/')
      .expect('X-Request-Id', uuidV4)
      .expect(400);

    expect(response.body).toEqual({
      code: 'HTTP_400', message: 'Bad Request',
      requestId: response.headers['x-request-id'],
    });
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('preserves the 03A readiness failure contract', async () => {
    findFirst.mockRejectedValueOnce(new Error('03B_PRIVATE_DATABASE_ERROR'));

    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect('X-Request-Id', uuidV4)
      .expect('Cache-Control', 'no-store')
      .expect(503)
      .expect({ status: 'not_ready' });

    const id = response.headers['x-request-id'] as string;
    expect(logsFor(id)).toHaveLength(1);
    expect(logsFor(id)[0]).toMatchObject({ statusCode: 503, errorCode: 'HTTP_503' });
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('also gives malformed JSON a sanitized error and request ID', async () => {
    const response = await request(app.getHttpServer())
      .post('/')
      .type('json')
      .send('{"password":"03B_PRIVATE_BODY",')
      .expect('X-Request-Id', uuidV4)
      .expect(400);

    const id = response.headers['x-request-id'] as string;
    expect(response.body).toEqual({
      code: 'HTTP_400', message: 'Bad Request', requestId: id,
    });
    expect(logsFor(id)).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('keeps concurrent requests separate', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer()).get('/health/live').expect('X-Request-Id', uuidV4).expect(200),
      request(app.getHttpServer()).get('/health/live').expect('X-Request-Id', uuidV4).expect(200),
    ]);
    const ids = responses.map((response) => response.headers['x-request-id'] as string);

    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(logsFor(id)).toHaveLength(1);
      expect(logsFor(id)[0]).toMatchObject({
        route: '/health/live', statusCode: 200,
      });
    }
  });
});
```

本课显式从 Vitest 导入 `vi` 和测试 API，来源直接可见；现有 globals 配置继续保留。`vi.fn()` 模拟查询，`vi.spyOn()` 临时替换现有方法：一处收集日志对象，另一处只在测试内让默认 Service 抛错。`afterEach` 恢复这些方法，因此不需要向正式 Controller 加调试报错接口。

7 个新用例检查实际 HTTP 装配、请求 ID 关联、已知/未知错误、输入脱敏、并发隔离及 03A 契约。Prisma 仍是替身，不能将这组测试写成真实数据库故障验收。

## 7. 执行已有检查并启动

完成 3 个新源码文件、AppModule 修改和 1 个新 E2E 文件后执行：

```sh
pnpm --filter @interview-forge/core-api run lint
pnpm --filter @interview-forge/core-api exec tsc --noEmit --incremental false
pnpm --filter @interview-forge/core-api run test
pnpm --filter @interview-forge/core-api run test:e2e
pnpm --filter @interview-forge/core-api run build
```

预期 lint、类型与构建通过，默认单测 1 个，E2E 共 12 个（已有 5 个 + 本课 7 个）。类型检查使用 `exec tsc`，不是 `run tsc`，当前没有名为 tsc 的 package script；如果终端过滤参数有问题，可使用已核验的等价命令：

```sh
pnpm --dir /Users/ytg/Documents/study/interview-study/apps/core-api exec tsc --noEmit --incremental false
```

检查依赖数据库正在运行，再启动构建产物：

```sh
docker compose --env-file infra/compose/.env -f infra/compose/compose.dev.yaml ps
NODE_ENV=test PORT=3001 pnpm --filter @interview-forge/core-api run start:prod
```

此处 NODE_ENV=test 只使用已有开关停用 Observe；真实启动仍连接应用数据库，不会使用测试替身。

另一个终端手动检查：

```sh
curl --max-time 15 -i -H 'X-Request-Id: 03B_CLIENT_ID' http://127.0.0.1:3001/health/live
curl --max-time 15 -i 'http://127.0.0.1:3001/03b-missing?token=03B_PRIVATE_QUERY'
curl --max-time 15 -i http://127.0.0.1:3001/health/ready
```

第一条应为 200 / alive，响应头中的 UUID 不等于输入的 03B_CLIENT_ID。第二条应为 404，body 的 requestId 与响应头一致；从 API 终端找到相同 ID 的 JSON 完成日志，日志没有查询参数。第三条在数据库正常时为 200 / ready。未知 500 已由自动测试验证，无需新增生产报错路由。

观察日志中的 `message.requestId`、`message.statusCode`、`message.errorCode`，不要把 Nest 的 pid、日志时间或业务 operationId 当作 requestId。结束后 Ctrl+C 停止 API。真实停库恢复可复用 03A 的步骤，但本轮不必为了演示 500 重复停库或修改权限。

## 8. 完成标准与下一步

| 验收项 | 预期 |
| --- | --- |
| 文件 | 新增 3 个 common/http 文件、1 个 E2E 文件；修改 AppModule |
| 自动检查 | lint、类型、构建、1 个单测和 12 个 E2E 通过 |
| 成功请求 | 原 body 保留，带服务器生成的请求 ID |
| 普通错误 | 状态正确，错误响应与日志 ID 一致，原始错误及私人输入不泄露 |
| 健康检查回归 | 原 03A 的 503 body 与恢复测试继续通过 |
| 手动验收 | 正常请求与 404 的响应头、错误 body、终端 JSON 日志可以关联 |

完成后反馈检查结果与一组去除敏感值的 404 响应/日志，我再检查实际文件。接下来是 **03C：运行时输入校验与字段错误**，再逐步建立身份与独立设备会话。本课完成不代表登录、对象授权、分布式追踪或全部业务错误体系已经实现。
