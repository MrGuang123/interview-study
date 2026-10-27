BEGIN;

-- CreateEnum
CREATE TYPE "core"."user_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "core"."users" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "status" "core"."user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_display_name_not_blank"
      CHECK (char_length(btrim("display_name")) > 0)
);

GRANT SELECT, INSERT, UPDATE
ON TABLE "core"."users"
TO forge_app;

COMMIT;
