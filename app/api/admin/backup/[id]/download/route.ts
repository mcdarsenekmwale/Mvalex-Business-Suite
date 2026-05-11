import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";
import { BackupStatus } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

export async function GET(
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
      return NextResponse.json({ error: "Backup is not ready for download" }, { status: 400 });
    }

    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      return NextResponse.json({ error: "Backup file not found on disk" }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(backup.filePath);
    const fileName = `${backup.name}.zip`;

    await ActivityLogger.log({
      userId: session.user.id,
      action: "BACKUP_DOWNLOADED",
      actionType: "EXPORT",
      entityType: "BACKUP",
      entityId: id,
      description: `Downloaded backup: ${backup.name}`,
      metadata: { backupName: backup.name, backupType: backup.type, backupSize: backup.size },
    });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": backup.size.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading backup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
