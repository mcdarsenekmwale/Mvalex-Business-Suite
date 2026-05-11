import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import extract from "extract-zip";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";
import { BackupStatus, RestoreStatus } from "@/generated/prisma/client";

const execAsync = promisify(exec);

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Super Admin required" }, { status: 401 });
    }

    const { id } = await params;

    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    if (backup.status !== BackupStatus.COMPLETED) {
      return NextResponse.json({ error: "Backup is not ready for restoration" }, { status: 400 });
    }

    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      return NextResponse.json({ error: "Backup file not found on disk" }, { status: 404 });
    }

    // Create restore record
    const restoreRecord = await prisma.backupRestore.create({
      data: {
        backupId: id,
        restoredBy: session.user.id,
        status: RestoreStatus.IN_PROGRESS,
        message: "Restoration started",
      },
    });

    await prisma.backupLog.create({
      data: {
        backupId: id,
        level: "INFO",
        message: `Restore started by ${session.user.id}`,
      },
    });

    const extractDir = path.join(process.cwd(), "tmp", `restore_${Date.now()}`);
    await fs.promises.mkdir(extractDir, { recursive: true });

    try {
      await extract(backup.filePath, { dir: extractDir });
      const files = await fs.promises.readdir(extractDir);

      for (const file of files) {
        const filePath = path.join(extractDir, file);
        if (file === "database.sql") {
          await restoreDatabase(filePath);
        } else if (file === "config.json") {
          await restoreConfiguration(filePath);
        } else if (file === "uploads") {
          await restoreFiles(filePath);
        }
      }

      await prisma.backupRestore.update({
        where: { id: restoreRecord.id },
        data: { status: RestoreStatus.COMPLETED, completedAt: new Date(), message: "Restoration completed successfully" },
      });

      await prisma.backupLog.create({
        data: {
          backupId: id,
          level: "INFO",
          message: "Restore completed successfully",
        },
      });

      await ActivityLogger.log({
        userId: session.user.id,
        action: "BACKUP_RESTORED",
        actionType: "UPDATE",
        entityType: "BACKUP",
        entityId: id,
        description: `Restored from backup: ${backup.name}`,
        metadata: { backupName: backup.name, backupType: backup.type },
      });

      return NextResponse.json({ success: true, message: "Backup restored successfully" });
    } catch (error: any) {
      await prisma.backupRestore.update({
        where: { id: restoreRecord.id },
        data: { status: RestoreStatus.FAILED, message: error.message },
      });
      await prisma.backupLog.create({
        data: {
          backupId: id,
          level: "ERROR",
          message: `Restore failed: ${error.message}`,
        },
      });
      throw error;
    } finally {
      await fs.promises.rm(extractDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}

async function restoreDatabase(filePath: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not configured");

  const url = new URL(databaseUrl);
  const database = url.pathname.slice(1);
  const user = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port || "5432";

  process.env.PGPASSWORD = password;

  try {
    await execAsync(
      `psql --host=${host} --port=${port} --username=${user} --dbname=${database} < ${filePath}`
    );
  } finally {
    delete process.env.PGPASSWORD;
  }
}

async function restoreConfiguration(filePath: string) {
  const configData = JSON.parse(await fs.promises.readFile(filePath, "utf-8")) as any;

  if (configData.settings) {
    for (const [key, value] of Object.entries(configData.settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      });
    }
  }

  if (configData.pricingRules) {
    for (const rule of configData.pricingRules as any[]) {
      await prisma.pricingRule.upsert({
        where: { action: rule.action },
        update: { cost: rule.cost, description: rule.description, isActive: rule.isActive },
        create: rule,
      });
    }
  }

  if (configData.emailTemplates) {
    for (const template of configData.emailTemplates as any[]) {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template,
      });
    }
  }
}

async function restoreFiles(sourcePath: string) {
  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    await fs.promises.mkdir(uploadsDir, { recursive: true });
  }

  const files = await fs.promises.readdir(sourcePath);
  for (const file of files) {
    const sourceFile = path.join(sourcePath, file);
    const destFile = path.join(uploadsDir, file);
    await fs.promises.copyFile(sourceFile, destFile);
  }
}
