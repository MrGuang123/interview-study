import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({
  path: resolve(__dirname, '.env.migration'),
});

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
    );
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
  throw new Error('This lesson requires both database on the same instance');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
    shadowDatabaseUrl: shadowUrl,
  },
});
