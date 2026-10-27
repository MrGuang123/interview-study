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
