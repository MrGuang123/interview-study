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
        // 连接超时时间
        connectionTimeoutMillis: 5_000,
        // 本地连接池上限
        max: 5,
      },
      {
        schema: 'core',
      },
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
