const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { config } = require('dotenv');

config({ path: resolve(__dirname, '../.env') });

const { PrismaService } = require('../dist/database/prisma.service');
const { UserStatus } = require('../dist/generated/prisma/client');

class ExpectedRoolback extends Error {}

async function main() {
  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const [connection] = await prisma.$queryRaw`
      SELECT
        current_user::text AS database_user,
        current_database()::text AS database_name
    `;
    assert.equal(connection.database_user, 'forge_app');
    assert.equal(connection.database_name, 'interview_core');

    const [permissions] = await prisma.$queryRaw`
      SELECT
        has_schema_privilege(current_user, 'core', 'CREATE') AS schema_create,
        has_table_privilege(current_user, 'core.users', 'SELECT') AS users_select,
        has_table_privilege(current_user, 'core.users', 'INSERT') AS users_insert,
        has_table_privilege(current_user, 'core.users', 'UPDATE') AS users_update,
        has_table_privilege(current_user, 'core.users', 'DELETE') AS users_delete,
        has_table_privilege(
          current_user,
          'core._prisma_migrations',
          'SELECT,INSERT,UPDATE,DELETE'
        ) AS migration_dml
    `;
    assert.equal(permissions.schema_create, false);
    assert.equal(permissions.users_select, true);
    assert.equal(permissions.users_insert, true);
    assert.equal(permissions.users_update, true);
    assert.equal(permissions.users_delete, false);
    assert.equal(permissions.migration_dml, false);

    let createdId;

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { displayName: '02C 验收学员' },
        });
        createdId = user.id;
        assert.equal(user.status, UserStatus.ACTIVE);
        assert.ok(user.createdAt instanceof Date);
        assert.ok(user.updatedAt instanceof Date);

        const loaded = await tx.user.findUniqueOrThrow({
          where: { id: createdId },
        });
        assert.equal(loaded.displayName, '02C 验收学员');

        const updated = await tx.user.update({
          where: { id: createdId },
          data: {
            displayName: '02C 验收学员（已修改）',
            status: UserStatus.DISABLED,
          },
        });
        assert.equal(updated.displayName, '02C 验收学员（已修改）');
        assert.equal(updated.status, UserStatus.DISABLED);

        throw new ExpectedRoolback('02C verification roolback');
      });
    } catch (error) {
      if (!(error instanceof ExpectedRoolback)) {
        throw error;
      }
    }

    assert.ok(createdId, 'The verification must create a user first');
    const afterRollback = await prisma.user.findUnique({
      where: { id: createdId },
    });
    assert.equal(afterRollback, null);
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    '02C passed: application permissions, create/read/update, rollback',
  );
}

main().catch((error) => {
  console.error('02C verification failed');
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
