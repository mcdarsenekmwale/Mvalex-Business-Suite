import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { BackupStatus } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Super Admin required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange");

    let startDate: Date | undefined;
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      switch (dateRange) {
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      startDate?.setHours(0, 0, 0, 0);
    }

    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    const [
      backups,
      totalBackups,
      completedBackups,
      failedBackups,
      totalRestores,
      activeSchedules,
    ] = await Promise.all([
      prisma.backup.findMany({ where }),
      prisma.backup.count(),
      prisma.backup.count({ where: { ...where, status: BackupStatus.COMPLETED } }),
      prisma.backup.count({ where: { ...where, status: BackupStatus.FAILED } }),
      prisma.backupRestore.count(),
      prisma.backupSchedule.count({ where: { isActive: true } }),
    ]);

    const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
    const lastBackup = backups[0];

    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public/uploads");
    let filesSize = 0;
    if (fs.existsSync(uploadsDir)) {
      const files = await fs.promises.readdir(uploadsDir, { recursive: true });
      for (const file of files) {
        try {
          const stats = await fs.promises.stat(path.join(uploadsDir, file as string));
          if (stats.isFile()) filesSize += stats.size;
        } catch {
          // skip
        }
      }
    }

    let databaseSize = 0;
    try {
      const result = await prisma.$queryRawUnsafe<{ size: bigint }[]>(
        `SELECT pg_database_size(current_database()) as size`
      );
      databaseSize = Number(result[0]?.size || "0");
    } catch (error) {
      console.error("Failed to get database size:", error);
    }

    const successRate = totalBackups > 0 ? Math.round((completedBackups / totalBackups) * 100) : 100;
    const averageBackupSize = totalBackups > 0 ? totalSize / totalBackups : 0;
    const storageLimit = parseInt(process.env.BACKUP_STORAGE_LIMIT || "10737418240");

    // Type distribution
    const typeDistribution = await prisma.backup.groupBy({
      by: ["type"],
      _count: true,
    });

    const stats = {
      totalBackups,
      totalSize,
      lastBackupAt: lastBackup?.createdAt || null,
      averageBackupSize,
      successRate,
      storageUsed: totalSize,
      storageLimit,
      databaseSize,
      filesSize,
      totalRestores,
      activeSchedules,
      typeDistribution,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching backup stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
