/**
 * MFA Seed Script
 * Creates sample MFA configuration and user MFA settings.
 */
import { PrismaClient, MFAMethod } from '../generated/prisma/client';
import { hashSync } from 'bcryptjs';
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedMFA() {
  console.log('🌱 Seeding MFA data...');

const _mfaConfig = await prisma.mFAConfig.findFirst();

if (_mfaConfig) {
  console.log('MFA Config already exists. Skipping seed.');
  return;
}

  // 1. Create global MFA config (disabled by default for safety)
  const mfaConfig = await prisma.mFAConfig.create({
    data: {
      enabled: false,
      enforceForRoles: ['ADMIN', 'SUPER_ADMIN'],
      allowedMethods: [MFAMethod.TOTP, MFAMethod.SMS, MFAMethod.EMAIL],
      gracePeriodDays: 7,
      rememberDevice: true,
      rememberDays: 30,
      maxAttempts: 5,
      lockoutMinutes: 15,
      updatedBy: null,
    },
  });
  console.log('✅ MFA Config:', mfaConfig.id);

  // 2. Find test users for MFA enrollment
  const users = await prisma.user.findMany({
    take: 2,
    where: {
      roles: {
        some: {
          role: {
            type: { in: ['ADMIN', 'SUPER_ADMIN'] },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true },
  });
  
  const regularUsers = await prisma.user.findMany({
    take: 2,
    where: {
      roles: {
        none: {
          role: {
            type: { in: ['ADMIN', 'SUPER_ADMIN'] },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log('⚠️  No users found. Skipping user MFA seed.');
    return;
  }

  const adminUser = users[0];
  const regularUser = regularUsers[1] || regularUsers[0];

  // 3. Create MFA settings for first user (TOTP enabled)
  const adminMFA = await prisma.userMFA.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      enabled: true,
      preferredMethod: MFAMethod.TOTP,
      backupCodes: [
        hashSync('BACKUP-ADMIN-001', 10),
        hashSync('BACKUP-ADMIN-002', 10),
        hashSync('BACKUP-ADMIN-003', 10),
        hashSync('BACKUP-ADMIN-004', 10),
        hashSync('BACKUP-ADMIN-005', 10),
        hashSync('BACKUP-ADMIN-006', 10),
        hashSync('BACKUP-ADMIN-007', 10),
        hashSync('BACKUP-ADMIN-008', 10),
      ],
      totpSecret: 'JBSWY3DPEHPK3PXP',
      emailVerified: true,
      lastVerifiedAt: new Date(),
    },
  });
  console.log('✅ User 1 MFA:', adminMFA.id, 'enabled:', adminMFA.enabled);

  // 4. Create MFA settings for second user (SMS, not enabled)
  if (regularUser.id !== adminUser.id) {
    const userMFA = await prisma.userMFA.upsert({
      where: { userId: regularUser.id },
      update: {},
      create: {
        userId: regularUser.id,
        enabled: false,
        preferredMethod: MFAMethod.SMS,
        backupCodes: [],
        phoneNumber: '+1-555-0100',
        phoneVerified: false,
        emailVerified: true,
      },
    });
    console.log('✅ User 2 MFA:', userMFA.id, 'enabled:', userMFA.enabled);
  }

  // 5. Create some verification logs
  await prisma.mFAVerification.createMany({
    data: [
      {
        userId: adminUser.id,
        method: MFAMethod.TOTP,
        success: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test)',
      },
      {
        userId: adminUser.id,
        method: MFAMethod.TOTP,
        success: true,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Test)',
      },
      {
        userId: regularUser.id,
        method: MFAMethod.SMS,
        success: false,
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (Test)',
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Verification logs created');

  // 6. Create trusted devices
  const now = new Date();
  await prisma.mFATrustedDevice.createMany({
    data: [
      {
        userId: adminUser.id,
        deviceId: 'device-admin-001',
        deviceName: 'MacBook Pro - Chrome',
        ipAddress: '192.168.1.100',
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        userId: adminUser.id,
        deviceId: 'device-admin-002',
        deviceName: 'iPhone - Safari',
        ipAddress: '192.168.1.101',
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Trusted devices created');

  console.log('🎉 MFA seeding complete!');
}

seedMFA()
  .catch((e) => {
    console.error('❌ MFA seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
