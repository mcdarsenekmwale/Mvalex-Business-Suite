import { BackupType, BackupStatus, StorageType, RestoreStatus, ScheduleFrequency, LogLevel } from "@/generated/prisma/client";
import  {PrismaClient}  from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedBackupSystem() {
  console.log("🌱 Seeding backup system...");

  // Get or create admin user
  let adminUser = await prisma.user.findFirst({
    where: { email: "admin@mvalex.com" },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash("Admin@2024!", 12);
    adminUser = await prisma.user.create({
      data: {
        email: "admin@mvalex.com",
        passwordHash: hashedPassword,
        name: "System Administrator",
        status: "ACTIVE",
        creditsBalance: 10000,
      },
    });
    console.log("  ✓ Created admin user");
  }

  const sampleBackups = [
    {
      id: "backup_full_2024_01_15",
      name: "full_backup_2024_01_15",
      type: BackupType.FULL,
      size: 15728640,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-01-15T02:00:00Z"),
      completedAt: new Date("2024-01-15T02:15:30Z"),
      metadata: { tables: 25, records: 12500, compression: "zip", level: 9 },
    },
    {
      id: "backup_db_2024_01_22",
      name: "database_backup_2024_01_22",
      type: BackupType.DATABASE,
      size: 5242880,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-01-22T02:00:00Z"),
      completedAt: new Date("2024-01-22T02:08:15Z"),
      metadata: { tables: 25, records: 12800 },
    },
    {
      id: "backup_files_2024_01_29",
      name: "files_backup_2024_01_29",
      type: BackupType.FILES,
      size: 10485760,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-01-29T03:00:00Z"),
      completedAt: new Date("2024-01-29T03:12:45Z"),
      metadata: { files: 345, directories: 12 },
    },
    {
      id: "backup_config_2024_02_05",
      name: "configuration_backup_2024_02_05",
      type: BackupType.CONFIGURATION,
      size: 524288,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-02-05T01:00:00Z"),
      completedAt: new Date("2024-02-05T01:02:10Z"),
      metadata: { settings: 45, templates: 12, rules: 8 },
    },
    {
      id: "backup_full_2024_02_12",
      name: "full_backup_2024_02_12",
      type: BackupType.FULL,
      size: 20971520,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-02-12T02:00:00Z"),
      completedAt: new Date("2024-02-12T02:20:00Z"),
      metadata: { tables: 26, records: 13200 },
    },
    {
      id: "backup_failed_attempt",
      name: "failed_backup_attempt",
      type: BackupType.FULL,
      size: 0,
      status: BackupStatus.FAILED,
      createdAt: new Date("2024-02-18T02:00:00Z"),
      metadata: { error: "Database connection timeout" },
      errorMessage: "Database connection timeout after 30 seconds",
    },
    {
      id: "backup_full_2024_02_25",
      name: "full_backup_2024_02_25",
      type: BackupType.FULL,
      size: 26214400,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-02-25T02:00:00Z"),
      completedAt: new Date("2024-02-25T02:25:30Z"),
      metadata: { tables: 27, records: 14100 },
    },
    {
      id: "backup_db_2024_03_03",
      name: "database_backup_2024_03_03",
      type: BackupType.DATABASE,
      size: 6291456,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-03-03T02:00:00Z"),
      completedAt: new Date("2024-03-03T02:10:00Z"),
      metadata: { tables: 28, records: 15300 },
    },
    {
      id: "backup_full_2024_03_10",
      name: "full_backup_2024_03_10",
      type: BackupType.FULL,
      size: 31457280,
      status: BackupStatus.IN_PROGRESS,
      createdAt: new Date("2024-03-10T02:00:00Z"),
      metadata: { progress: 65 },
    },
    {
      id: "backup_pre_upgrade",
      name: "pre_upgrade_backup",
      type: BackupType.FULL,
      size: 41943040,
      status: BackupStatus.COMPLETED,
      createdAt: new Date("2024-03-15T01:00:00Z"),
      completedAt: new Date("2024-03-15T01:35:00Z"),
      metadata: { tables: 30, records: 16800, version: "2.0.0" },
    },
  ];

  for (const backup of sampleBackups) {
    await prisma.backup.upsert({
      where: { id: backup.id },
      update: {},
      create: {
        ...backup,
        createdBy: adminUser.id,
        filePath: `/backups/${backup.name}.zip`,
        checksum: `sha256_${Math.random().toString(36).substring(2, 15)}`,
        compression: "zip",
        compressionLevel: 9,
        storageType: StorageType.LOCAL,
      },
    });
    console.log(`  ✓ Created backup: ${backup.name} (${backup.status})`);
  }

  // Create restore history
  const restoreHistory = [
    {
      backupId: "backup_full_2024_01_15",
      restoredBy: adminUser.id,
      status: RestoreStatus.COMPLETED,
      createdAt: new Date("2024-01-16T10:30:00Z"),
      completedAt: new Date("2024-01-16T10:45:00Z"),
      message: "Successfully restored after testing",
    },
    {
      backupId: "backup_db_2024_01_22",
      restoredBy: adminUser.id,
      status: RestoreStatus.COMPLETED,
      createdAt: new Date("2024-01-23T14:20:00Z"),
      completedAt: new Date("2024-01-23T14:28:00Z"),
      message: "Database rollback completed",
    },
  ];

  for (const restore of restoreHistory) {
    await prisma.backupRestore.upsert({
      where: { id: `restore_${restore.backupId}` },
      update: {},
      create: {
        id: `restore_${restore.backupId}`,
        ...restore,
      },
    });
    console.log(`  ✓ Created restore record for ${restore.backupId}`);
  }

  // Create backup schedules
  const now = new Date();
  const schedules = [
    {
      id: "schedule_daily_full",
      name: "Daily Full Backup",
      type: BackupType.FULL,
      frequency: ScheduleFrequency.DAILY,
      time: "02:00",
      retentionDays: 30,
      isActive: true,
      nextRunAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0),
    },
    {
      id: "schedule_weekly_db",
      name: "Weekly Database Backup",
      type: BackupType.DATABASE,
      frequency: ScheduleFrequency.WEEKLY,
      time: "03:00",
      dayOfWeek: 0,
      retentionDays: 60,
      isActive: true,
      nextRunAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7 || 7), 3, 0, 0),
    },
    {
      id: "schedule_monthly_config",
      name: "Monthly Configuration Backup",
      type: BackupType.CONFIGURATION,
      frequency: ScheduleFrequency.MONTHLY,
      time: "04:00",
      dayOfMonth: 1,
      retentionDays: 365,
      isActive: true,
      nextRunAt: new Date(now.getFullYear(), now.getMonth() + 1, 1, 4, 0, 0),
    },
  ];

  for (const schedule of schedules) {
    await prisma.backupSchedule.upsert({
      where: { id: schedule.id },
      update: {},
      create: {
        ...schedule,
        createdBy: adminUser.id,
      },
    });
    console.log(`  ✓ Created schedule: ${schedule.name}`);
  }

  // Create backup logs
  const logs = [
    { backupId: "backup_full_2024_03_10", level: LogLevel.INFO, message: "Backup started", createdAt: new Date("2024-03-10T02:00:00Z") },
    { backupId: "backup_full_2024_03_10", level: LogLevel.INFO, message: "Exporting database", createdAt: new Date("2024-03-10T02:01:30Z") },
    { backupId: "backup_full_2024_03_10", level: LogLevel.INFO, message: "Compressing files", createdAt: new Date("2024-03-10T02:15:00Z") },
    { backupId: "backup_failed_attempt", level: LogLevel.ERROR, message: "Connection timeout", createdAt: new Date("2024-02-18T02:05:00Z") },
    { backupId: "backup_failed_attempt", level: LogLevel.ERROR, message: "Backup failed", createdAt: new Date("2024-02-18T02:06:00Z") },
    { backupId: "backup_pre_upgrade", level: LogLevel.WARNING, message: "Large backup size detected", createdAt: new Date("2024-03-15T01:30:00Z") },
    { backupId: "backup_pre_upgrade", level: LogLevel.INFO, message: "Backup completed successfully", createdAt: new Date("2024-03-15T01:35:00Z") },
  ];

  for (const log of logs) {
    await prisma.backupLog.create({
      data: log,
    });
  }
  console.log("  ✓ Created backup logs");

  console.log("\n✅ Backup system seeding completed!");
  console.log("\n📊 Backup Statistics:");
  console.log(`  - Total backups: ${sampleBackups.length}`);
  console.log(`  - Successful backups: ${sampleBackups.filter((b) => b.status === BackupStatus.COMPLETED).length}`);
  console.log(`  - Failed backups: ${sampleBackups.filter((b) => b.status === BackupStatus.FAILED).length}`);
  console.log(`  - Scheduled backups: ${schedules.length}`);
  console.log(`  - Restore operations: ${restoreHistory.length}`);
}

seedBackupSystem()
  .catch((e) => {
    console.error("❌ Backup seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
