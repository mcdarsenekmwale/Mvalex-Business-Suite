-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleType" ADD VALUE 'SUPPORT_AGENT';
ALTER TYPE "RoleType" ADD VALUE 'SUPPORT_MANAGER';
ALTER TYPE "RoleType" ADD VALUE 'USER_ADMIN';
ALTER TYPE "RoleType" ADD VALUE 'AUDIT_MANAGER';
ALTER TYPE "RoleType" ADD VALUE 'GLOBAL_READER';
ALTER TYPE "RoleType" ADD VALUE 'VIEWER';
ALTER TYPE "RoleType" ADD VALUE 'AGENT';
