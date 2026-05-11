-- CreateEnum
CREATE TYPE "MFAMethod" AS ENUM ('TOTP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "RecoveryType" AS ENUM ('CODE_REQUEST', 'PHONE_CHANGE', 'EMAIL_CHANGE', 'RESET_REQUEST');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'USED');

-- CreateEnum
CREATE TYPE "MFACodeType" AS ENUM ('SMS', 'EMAIL');

-- CreateTable
CREATE TABLE "mfa_configs" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enforceForRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedMethods" "MFAMethod"[] DEFAULT ARRAY['TOTP', 'EMAIL']::"MFAMethod"[],
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "rememberDevice" BOOLEAN NOT NULL DEFAULT true,
    "rememberDays" INTEGER NOT NULL DEFAULT 30,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mfas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "preferredMethod" "MFAMethod" NOT NULL DEFAULT 'TOTP',
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totpSecret" TEXT,
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "recoveryEmail" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "disabledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mfas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "MFAMethod" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_trusted_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_recoveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" "RecoveryType" NOT NULL DEFAULT 'CODE_REQUEST',
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "MFACodeType" NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_mfas_userId_key" ON "user_mfas"("userId");

-- CreateIndex
CREATE INDEX "user_mfas_userId_idx" ON "user_mfas"("userId");

-- CreateIndex
CREATE INDEX "user_mfas_enabled_idx" ON "user_mfas"("enabled");

-- CreateIndex
CREATE INDEX "mfa_verifications_userId_idx" ON "mfa_verifications"("userId");

-- CreateIndex
CREATE INDEX "mfa_verifications_createdAt_idx" ON "mfa_verifications"("createdAt");

-- CreateIndex
CREATE INDEX "mfa_verifications_success_idx" ON "mfa_verifications"("success");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_trusted_devices_deviceId_key" ON "mfa_trusted_devices"("deviceId");

-- CreateIndex
CREATE INDEX "mfa_trusted_devices_userId_idx" ON "mfa_trusted_devices"("userId");

-- CreateIndex
CREATE INDEX "mfa_trusted_devices_deviceId_idx" ON "mfa_trusted_devices"("deviceId");

-- CreateIndex
CREATE INDEX "mfa_trusted_devices_expiresAt_idx" ON "mfa_trusted_devices"("expiresAt");

-- CreateIndex
CREATE INDEX "mfa_recoveries_userId_idx" ON "mfa_recoveries"("userId");

-- CreateIndex
CREATE INDEX "mfa_recoveries_code_idx" ON "mfa_recoveries"("code");

-- CreateIndex
CREATE INDEX "mfa_recoveries_status_idx" ON "mfa_recoveries"("status");

-- CreateIndex
CREATE INDEX "mfa_codes_userId_idx" ON "mfa_codes"("userId");

-- CreateIndex
CREATE INDEX "mfa_codes_code_idx" ON "mfa_codes"("code");

-- CreateIndex
CREATE INDEX "mfa_codes_expiresAt_idx" ON "mfa_codes"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_mfas" ADD CONSTRAINT "user_mfas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_verifications" ADD CONSTRAINT "mfa_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_trusted_devices" ADD CONSTRAINT "mfa_trusted_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recoveries" ADD CONSTRAINT "mfa_recoveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
