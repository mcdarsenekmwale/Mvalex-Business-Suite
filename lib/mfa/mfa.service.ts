import { prisma } from "@/lib/prisma";
import speakeasy from "speakeasy";
import { hash, compare } from "bcryptjs";
import { NotificationService } from "@/lib/notifications/notification.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";
import {
  MFAMethod,
  MFACodeType,
  type Prisma,
  RoleType,
} from "@/generated/prisma/client";

/**
 * Production-ready Multi-Factor Authentication service.
 * Supports TOTP (authenticator apps), SMS codes, and Email codes.
 */
export class MFAService {
  private static readonly BACKUP_CODE_COUNT = 10;
  private static readonly CODE_LENGTH = 6;
  private static readonly CODE_EXPIRY_MINUTES = 5;
  private static readonly TOTP_WINDOW = 1;

  // --- TOTP ---

  static async generateTOTPSecret(
    userId: string,
    email: string
  ): Promise<{
    secret: string;
    qrCodeUrl: string;
    rawBackupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({ length: 32 }).base32;
    const otpauth = speakeasy.otpauthURL({
      secret,
      label: encodeURIComponent(email),
      issuer: "Mvalex Business Suite",
      encoding: "base32",
    });

    // Generate backup codes
    const rawCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = this.generateBackupCode();
      rawCodes.push(code);
      hashedCodes.push(await hash(code, 10));
    }

    await prisma.userMFA.upsert({
      where: { userId },
      update: {
        totpSecret: secret,
        backupCodes: hashedCodes,
        enabled: false,
      },
      create: {
        userId,
        totpSecret: secret,
        backupCodes: hashedCodes,
        enabled: false,
        preferredMethod: MFAMethod.TOTP,
      },
    });

    return {
      secret,
      qrCodeUrl: otpauth,
      rawBackupCodes: rawCodes,
    };
  }

  static async verifyAndEnableTOTP(
    userId: string,
    token: string,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const userMFA = await prisma.userMFA.findUnique({ where: { userId } });
    if (!userMFA?.totpSecret) {
      throw new Error("TOTP not initialized");
    }

    const isValid = speakeasy.totp.verify({
      secret: userMFA.totpSecret,
      token,
      encoding: "base32",
      window: this.TOTP_WINDOW,
    });

    if (!isValid) {
      await this.logVerification(userId, MFAMethod.TOTP, false, ipAddress, userAgent);
      return false;
    }

    // Update user MFA status
    await prisma.userMFA.update({
      where: { userId },
      data: {
        enabled: true,
        preferredMethod: MFAMethod.TOTP,
        lastVerifiedAt: new Date(),
      },
    });

    if (deviceName) {
      await this.addTrustedDevice(userId, deviceName, ipAddress, userAgent);
    }

    await this.logVerification(userId, MFAMethod.TOTP, true, ipAddress, userAgent);

    await NotificationService.send({
      userId,
      title: "MFA Enabled",
      message: "Multi-factor authentication has been enabled on your account using an authenticator app.",
      type: "SYSTEM_ALERT",
    });

    await ActivityLogger.log({
      userId,
      action: "MFA_ENABLED",
      actionType: "UPDATE",
      entityType: "USER",
      description: "Enabled TOTP MFA",
      metadata: { method: "TOTP" },
    });

    return true;
  }

  static async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const userMFA = await prisma.userMFA.findUnique({ where: { userId } });
    if (!userMFA?.totpSecret || !userMFA.enabled) return false;

    return speakeasy.totp.verify({
      secret: userMFA.totpSecret,
      token,
      encoding: "base32",
      window: this.TOTP_WINDOW,
    });
  }

  // --- SMS / Email Codes ---

  static async sendSMSCode(userId: string, phoneNumber?: string): Promise<void> {
    const userMFA = await prisma.userMFA.findUnique({ where: { userId } });
    const phone = phoneNumber || userMFA?.phoneNumber;
    if (!phone) throw new Error("Phone number not configured");

    const code = this.generateNumericCode();

    await this.storeCode(userId, code, MFACodeType.SMS);
    await this.sendSMS(phone, `Your Mvalex verification code is: ${code}. Valid for ${this.CODE_EXPIRY_MINUTES} minutes.`);

    // Update phone if new
    if (phoneNumber && phoneNumber !== userMFA?.phoneNumber) {
      await prisma.userMFA.update({
        where: { userId },
        data: { phoneNumber, phoneVerified: false },
      });
    }
  }

  static async sendEmailCode(userId: string, email?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const targetEmail = email || user?.email;
    if (!targetEmail) throw new Error("Email not configured");

    const code = this.generateNumericCode();

    await this.storeCode(userId, code, MFACodeType.EMAIL);
    await NotificationService.send({
      userId,
      title: "MFA Verification Code",
      message: `Your verification code is: ${code}. This code expires in ${this.CODE_EXPIRY_MINUTES} minutes.`,
      type: "SYSTEM_ALERT",
      channels: ["EMAIL"],
    });
  }

  static async verifyCode(userId: string, code: string, type: MFACodeType): Promise<boolean> {
    const record = await prisma.mFACode.findFirst({
      where: {
        userId,
        code,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) return false;

    await prisma.mFACode.update({
      where: { id: record.id },
      data: { used: true },
    });

    return true;
  }

  // --- Backup Codes ---

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const userMFA = await prisma.userMFA.findUnique({ where: { userId } });
    if (!userMFA?.backupCodes?.length) return false;

    for (const hashedCode of userMFA.backupCodes) {
      if (await compare(code, hashedCode)) {
        const newCodes = userMFA.backupCodes.filter((c) => c !== hashedCode);
        await prisma.userMFA.update({
          where: { userId },
          data: { backupCodes: newCodes },
        });

        await ActivityLogger.log({
          userId,
          action: "MFA_BACKUP_USED",
          actionType: "UPDATE",
          entityType: "USER",
          description: "Used a backup code for MFA",
        });

        return true;
      }
    }

    return false;
  }

  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const rawCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = this.generateBackupCode();
      rawCodes.push(code);
      hashedCodes.push(await hash(code, 10));
    }

    await prisma.userMFA.update({
      where: { userId },
      data: { backupCodes: hashedCodes },
    });

    return rawCodes;
  }

  // --- Status & Requirements ---

  static async requiresMFA(userId: string, userRole: string): Promise<boolean> {
    const config = await prisma.mFAConfig.findFirst();
    if (!config?.enabled) return false;

    if (!config.enforceForRoles.includes(userRole)) return false;

    const userMFA = await prisma.userMFA.findUnique({ where: { userId } });
    return !userMFA?.enabled;
  }

  static async getMFAStatus(userId: string) {
    const userMFA = await prisma.userMFA.findUnique({ where: { userId } });
    return {
      enabled: userMFA?.enabled ?? false,
      method: userMFA?.preferredMethod ?? MFAMethod.TOTP,
      phoneVerified: userMFA?.phoneVerified ?? false,
      emailVerified: userMFA?.emailVerified ?? false,
      hasBackupCodes: (userMFA?.backupCodes?.length || 0) > 0,
      phoneNumber: userMFA?.phoneNumber ?? null,
      recoveryEmail: userMFA?.recoveryEmail ?? null,
      lastVerifiedAt: userMFA?.lastVerifiedAt ?? null,
    };
  }

  static async isMFAEnabled(userId: string): Promise<boolean> {
    const userMFA = await prisma.userMFA.findUnique({
      where: { userId },
      select: { enabled: true },
    });
    return userMFA?.enabled ?? false;
  }

  // --- Trusted Devices ---

  static async addTrustedDevice(
    userId: string,
    deviceName: string,
    ipAddress?: string,
    userAgent?: string,
    deviceType?: string
  ): Promise<string> {
    const config = await prisma.mFAConfig.findFirst();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (config?.rememberDays || 30));

    const deviceId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    await prisma.mFATrustedDevice.create({
      data: {
        userId,
        deviceId,
        deviceName,
        deviceType: deviceType || "unknown",
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return deviceId;
  }

  static async isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
    const device = await prisma.mFATrustedDevice.findUnique({ where: { deviceId } });
    if (!device || device.userId !== userId) return false;

    if (device.expiresAt < new Date()) {
      await prisma.mFATrustedDevice.delete({ where: { deviceId } });
      return false;
    }

    await prisma.mFATrustedDevice.update({
      where: { deviceId },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  static async removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    await prisma.mFATrustedDevice.deleteMany({
      where: { userId, deviceId },
    });
  }

  static async listTrustedDevices(userId: string) {
    return prisma.mFATrustedDevice.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });
  }

  // --- Disable / Reset ---

  static async disableMFA(userId: string, reason?: string, disabledBy: string = "user"): Promise<void> {
    await prisma.userMFA.update({
      where: { userId },
      data: {
        enabled: false,
        disabledAt: new Date(),
        disabledBy,
      },
    });

    await prisma.mFATrustedDevice.deleteMany({ where: { userId } });

    await NotificationService.send({
      userId,
      title: "MFA Disabled",
      message: `Multi-factor authentication has been disabled on your account.${reason ? ` Reason: ${reason}` : ""}`,
      type: "SYSTEM_ALERT",
    });

    await ActivityLogger.log({
      userId,
      action: "MFA_DISABLED",
      actionType: "UPDATE",
      entityType: "USER",
      description: `MFA disabled by ${disabledBy}`,
      metadata: { reason },
    });
  }

  static async resetMFA(userId: string): Promise<void> {
    await prisma.userMFA.deleteMany({ where: { userId } });
    await prisma.mFATrustedDevice.deleteMany({ where: { userId } });
    await prisma.mFAVerification.deleteMany({ where: { userId } });

    await NotificationService.send({
      userId,
      title: "MFA Reset",
      message: "Your multi-factor authentication settings have been reset. Please set up MFA again.",
      type: "SYSTEM_ALERT",
    });
  }

  // --- Admin Config ---

  static async getConfig() {
    return prisma.mFAConfig.findFirst();
  }

  static async updateConfig(data: Prisma.MFAConfigUpdateInput, updatedBy?: string) {
    const existing = await prisma.mFAConfig.findFirst();
    if (existing) {
      return prisma.mFAConfig.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: updatedBy || existing.updatedBy },
      });
    }
    return prisma.mFAConfig.create({
      data: { ...(data as Prisma.MFAConfigCreateInput), updatedBy: updatedBy || null },
    });
  }

  // --- Stats ---

  static async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEnabled,
      totalUsers,
      byMethod,
      enrolledAdmins,
      verifiedToday,
      activeDevices,
      pendingSetup,
    ] = await Promise.all([
      prisma.userMFA.count({ where: { enabled: true } }),
      prisma.user.count(),
      prisma.userMFA.groupBy({
        by: ["preferredMethod"],
        where: { enabled: true },
        _count: true,
      }),
      prisma.userMFA.count({
        where: {
          enabled: true,
          user: {
            roles: {
              some: {
                role: {
                  type: { in: ["ADMIN", "SUPER_ADMIN"] },
                },
              },
            },
          },
        },
      }),
      prisma.mFAVerification.count({
        where: {
          success: true,
          createdAt: { gte: today },
        },
      }),
      prisma.mFATrustedDevice.count({
        where: { expiresAt: { gt: new Date() } },
      }),
      (async () => {
        const config = await prisma.mFAConfig.findFirst();
        if (!config?.enabled || config.enforceForRoles.length === 0) return 0;
        const enrolled = await prisma.userMFA.count({ where: { enabled: true } });
        const total = await prisma.user.count({
          where: {
            roles: {
              some: {
                role: {
                  type: { in: config.enforceForRoles  as RoleType[] },
                },
              },
            },
          },
        });
        return Math.max(0, total - enrolled);
      })(),
    ]);

    return {
      totalEnrolled: totalEnabled,
      totalUsers,
      adoptionRate: totalUsers > 0 ? Math.round((totalEnabled / totalUsers) * 100) : 0,
      byMethod,
      enrolledAdmins,
      verifiedToday,
      activeDevices,
      pendingSetup,
    };
  }

  // --- Private helpers ---

  private static generateBackupCode(): string {
    return crypto.randomUUID().toString().toUpperCase();
  }

  private static generateNumericCode(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  private static async storeCode(userId: string, code: string, type: MFACodeType): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

    await prisma.mFACode.create({
      data: { userId, code, type, expiresAt },
    });
  }

  private static async logVerification(
    userId: string,
    method: MFAMethod,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.mFAVerification.create({
      data: { userId, method, success, ipAddress, userAgent },
    });
  }

  private static async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // TODO: Integrate with Twilio, SNS, or other SMS provider
    console.log(`[MFA SMS] to ${phoneNumber}: ${message}`);
  }
}
