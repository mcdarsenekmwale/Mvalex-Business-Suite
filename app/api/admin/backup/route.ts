// app/api/admin/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

const execAsync = promisify(exec);

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

// Backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get all backups
export async function GET(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Super Admin required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get backups from database
    const [backups, total] = await Promise.all([
      prisma.backup.findMany({
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.backup.count(),
    ]);

    // Get file sizes for backups that exist on disk
    const backupsWithSize = await Promise.all(
      backups.map(async (backup) => {
        let size = backup.size;
        let status = backup.status;
        
        // Check if file exists on disk
        if (backup.filePath) {
          try {
            const stats = await fs.promises.stat(backup.filePath);
            size = stats.size;
            if (backup.status === "COMPLETED" && !fs.existsSync(backup.filePath)) {
              status = "MISSING";
            }
          } catch (error) {
            // File not found
            status = "MISSING";
          }
        }
        
        return {
          ...backup,
          size,
          status,
          downloadUrl: `/api/admin/backup/${backup.id}/download`,
        };
      })
    );

    return NextResponse.json({
      backups: backupsWithSize,
      pagination: {
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching backups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new backup
export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Super Admin required" }, { status: 401 });
    }

    const body = await req.json();
    const { type = "full" } = body;

    // Validate backup type
    const validTypes = ["full", "database", "files", "configuration"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid backup type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        name: `${type}_backup_${new Date().toISOString().substring(0, 10).replace(/[:.]/g, "-").replaceAll("-", "_")}`,
        type:type.toUpperCase(),
        size: 0,
        status: "IN_PROGRESS",
        createdBy: session.user.id,
      
        filePath: path.join(BACKUP_DIR, `${type}_backup_${Date.now()}.zip`),
      },
    });

    // Start backup process asynchronously
    performBackup(backup.id, type, backup.filePath as string).catch(async (error) => {
      console.error(`Backup ${backup.id} failed:`, error);
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: "FAILED",
          metadata: {
            error: error.message,
            failedAt: new Date().toISOString(),
          },
        },
      });
    });

    // Log activity
    await ActivityLogger.log({
      userId: session.user.id,
      action: "BACKUP_CREATED",
      actionType: "CREATE",
      entityType: "BACKUP",
      entityId: backup.id,
      description: `Started ${type} backup`,
      metadata: { type, backupId: backup.id },
    });

    return NextResponse.json({
      success: true,
      backup: {
        id: backup.id,
        name: backup.name,
        type: backup.type,
        status: "in_progress",
        createdAt: backup.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete old backups (bulk)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Super Admin required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get("olderThan");
    const keepLast = parseInt(searchParams.get("keepLast") || "10");

    let where: any = {};

    if (olderThan) {
      const date = new Date(olderThan);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for olderThan" },
          { status: 400 }
        );
      }
      where.createdAt = { lt: date };
    }

    // Get backups to delete
    const backupsToDelete = await prisma.backup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: keepLast,
    });

    let deletedCount = 0;
    let deletedSize = 0;

    for (const backup of backupsToDelete) {
      // Delete file from disk
      if (backup.filePath && fs.existsSync(backup.filePath)) {
        try {
          const stats = await fs.promises.stat(backup.filePath);
          deletedSize += stats.size;
          await fs.promises.unlink(backup.filePath);
        } catch (error) {
          console.error(`Failed to delete backup file ${backup.filePath}:`, error);
        }
      }

      // Delete database record
      await prisma.backup.delete({ where: { id: backup.id } });
      deletedCount++;
    }

    // Log activity
    await ActivityLogger.log({
      userId: session.user.id,
      action: "BACKUPS_CLEANED",
      actionType: "DELETE",
      entityType: "BACKUP",
      description: `Deleted ${deletedCount} old backups (${(deletedSize / 1024 / 1024).toFixed(2)} MB)`,
      metadata: { olderThan, keepLast, deletedCount, deletedSize },
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedSize: formatBytes(deletedSize),
    });
  } catch (error) {
    console.error("Error deleting backups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to perform backup
async function performBackup(backupId: string, type: string, filePath: string) {
  const output = fs.createWriteStream(filePath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", async () => {
    const size = archive.pointer();
    
    await prisma.backup.update({
      where: { id: backupId },
      data: {
        size,
        status: "COMPLETED",
        completedAt: new Date(),
        metadata: {
          compression: "zip",
          level: 9,
        },
      },
    });
  });

  archive.on("error", async (err) => {
    throw err;
  });

  archive.pipe(output);

  if (type === "database" || type === "full") {
    // Database backup
    const databaseDump = await createDatabaseDump();
    archive.append(databaseDump, { name: "database.sql" });
  }

  if (type === "files" || type === "full") {
    // Files backup
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public/uploads");
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, "uploads");
    }
  }

  if (type === "configuration" || type === "full") {
    // Configuration backup
    const config = await exportConfiguration();
    archive.append(JSON.stringify(config, null, 2), { name: "config.json" });
  }

  await archive.finalize();
}

// Create database dump
async function createDatabaseDump(): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  // Parse database URL
  const url = new URL(databaseUrl);
  const database = url.pathname.slice(1);
  const user = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port || "5432";

  // Set PGPASSWORD environment variable
  process.env.PGPASSWORD = password;

  try {
    const { stdout } = await execAsync(
      `pg_dump --host=${host} --port=${port} --username=${user} --format=plain --no-owner --no-acl ${database}`
    );
    return stdout;
  } finally {
    delete process.env.PGPASSWORD;
  }
}

// Export configuration
async function exportConfiguration(): Promise<Record<string, any>> {
  // Get system settings
  const settings = await prisma.systemSetting.findMany();
  
  // Get pricing rules
  const pricingRules = await prisma.pricingRule.findMany();
  
  // Get email templates
  const emailTemplates = await prisma.emailTemplate.findMany({
    select: {
      name: true,
      subject: true,
      body: true,
      type: true,
      category: true,
    },
  });
  
  // Get business card templates
  const cardTemplates = await prisma.businessCardTemplate.findMany({
    select: {
      name: true,
      category: true,
      description: true,
      frontConfig: true,
      backConfig: true,
    },
  });
  
  // Get invoice templates
  const invoiceTemplates = await prisma.invoiceTemplate.findMany({
    select: {
      name: true,
      type: true,
      description: true,
      config: true,
    },
  });

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    settings: settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}),
    pricingRules,
    emailTemplates,
    cardTemplates,
    invoiceTemplates,
  };
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}