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

const uuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      return (
        row.event === 'http.request.completed' && row.requestId === requestId
      );
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

  it('keeps succes body and generates its own ID without logging private inputs', async () => {
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
      code: 'HTTP_404',
      message: 'Not Found',
      requestId: id,
    });
    expect(logsFor(id)).toHaveLength(1);
    expect(logsFor(id)[0]).toMatchObject({
      statusCode: 404,
      errorCode: 'HTTP_404',
    });
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('sanitized an unexpected error', async () => {
    vi.spyOn(app.get(AppService), 'getHello').mockImplementation(() => {
      throw new Error('03B_PRIVATE_EXCEPTION');
    });

    const response = await request(app.getHttpServer())
      .get('/')
      .expect('X-Request-Id', uuidV4)
      .expect(500);

    const id = response.headers['x-request-id'] as string;
    expect(response.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal Server Error',
      requestId: id,
    });
    expect(logsFor(id)).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain('03B_PRIVATE_');
  });

  it('does not forward arbitrary HttpException messages', async () => {
    vi.spyOn(app.get(AppService), 'getHello').mockImplementation(() => {
      throw new BadRequestException('03b_PRIVATE_VALIDATION_MESSAGE');
    });

    const response = await request(app.getHttpServer())
      .get('/')
      .expect('X-Request-Id', uuidV4)
      .expect(400);

    expect(response.body).toEqual({
      code: 'HTTP_400',
      message: 'Bad Request',
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
    expect(logsFor(id)[0]).toMatchObject({
      statusCode: 503,
      errorCode: 'HTTP_503',
    });
    expect(JSON.stringify(messages)).not.toContain('03B-PRIVATE_');
  });

  it('also gives malformed JSON a sanitized error and request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .type('json')
      .send('{"password":"03B_PRIVATE_BODY",')
      .expect('X-Request-Id', uuidV4)
      .expect(400);

    const id = response.headers['x-request-id'] as string;
    expect(response.body).toEqual({
      code: 'HTTP_400',
      message: 'Bad Request',
      requestId: id,
    });
    expect(logsFor(id)).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain('03B-PRIVATE_');
  });

  it('keeps concurrent requests separate', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer())
        .get('/health/live')
        .expect('X-Request-id', uuidV4)
        .expect(200),
      request(app.getHttpServer())
        .get('/health/live')
        .expect('X-Request-id', uuidV4)
        .expect(200),
    ]);
    const ids = responses.map(
      (response) => response.headers['x-request-id'] as string,
    );

    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(logsFor(id)).toHaveLength(1);
      expect(logsFor(id)[0]).toMatchObject({
        route: '/health/live',
        statusCode: 200,
      });
    }
  });
});
