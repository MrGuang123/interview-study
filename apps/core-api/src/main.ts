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
      throw new Error('PostgreSQL applicatioin role/schema check failed');
    }

    Logger.log(JSON.stringify(check), 'DatabaseCheck');
    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    await app.close();
    throw error;
  }
}
void bootstrap();
