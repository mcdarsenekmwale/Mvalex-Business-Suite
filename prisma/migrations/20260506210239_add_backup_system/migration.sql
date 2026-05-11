-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('FULL', 'DATABASE', 'FILES', 'CONFIGURATION');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'MISSING');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('LOCAL', 'S3', 'FTP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RestoreStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'DEBUG');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT;

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channels" "NotificationChannel"[] DEFAULT ARRAY['IN_APP', 'EMAIL']::"NotificationChannel"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_performances" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tickets_resolved" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" INTEGER NOT NULL DEFAULT 0,
    "satisfaction_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_work_time" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agent_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BackupType" NOT NULL DEFAULT 'FULL',
    "size" INTEGER NOT NULL DEFAULT 0,
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "checksum" TEXT,
    "compression" TEXT DEFAULT 'zip',
    "compressionLevel" INTEGER DEFAULT 9,
    "storageType" "StorageType" NOT NULL DEFAULT 'LOCAL',
    "storageLocation" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_restores" (
    "id" TEXT NOT NULL,
    "backupId" TEXT NOT NULL,
    "restoredBy" TEXT NOT NULL,
    "status" "RestoreStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "backup_restores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BackupType" NOT NULL DEFAULT 'FULL',
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'DAILY',
    "time" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_logs" (
    "id" TEXT NOT NULL,
    "backupId" TEXT,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_key" ON "notification_templates"("name");

-- CreateIndex
CREATE INDEX "notification_templates_type_isActive_idx" ON "notification_templates"("type", "isActive");

-- CreateIndex
CREATE INDEX "agent_performances_date_idx" ON "agent_performances"("date");

-- CreateIndex
CREATE INDEX "agent_performances_agent_id_idx" ON "agent_performances"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_performances_agent_id_date_key" ON "agent_performances"("agent_id", "date");

-- CreateIndex
CREATE INDEX "backups_status_idx" ON "backups"("status");

-- CreateIndex
CREATE INDEX "backups_createdAt_idx" ON "backups"("createdAt");

-- CreateIndex
CREATE INDEX "backups_type_idx" ON "backups"("type");

-- CreateIndex
CREATE INDEX "backups_createdBy_idx" ON "backups"("createdBy");

-- CreateIndex
CREATE INDEX "backup_restores_backupId_idx" ON "backup_restores"("backupId");

-- CreateIndex
CREATE INDEX "backup_restores_restoredBy_idx" ON "backup_restores"("restoredBy");

-- CreateIndex
CREATE INDEX "backup_restores_createdAt_idx" ON "backup_restores"("createdAt");

-- CreateIndex
CREATE INDEX "backup_schedules_isActive_idx" ON "backup_schedules"("isActive");

-- CreateIndex
CREATE INDEX "backup_schedules_nextRunAt_idx" ON "backup_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "backup_logs_backupId_idx" ON "backup_logs"("backupId");

-- CreateIndex
CREATE INDEX "backup_logs_level_idx" ON "backup_logs"("level");

-- CreateIndex
CREATE INDEX "backup_logs_createdAt_idx" ON "backup_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "agent_performances" ADD CONSTRAINT "agent_performances_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_restoredBy_fkey" FOREIGN KEY ("restoredBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "backups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
