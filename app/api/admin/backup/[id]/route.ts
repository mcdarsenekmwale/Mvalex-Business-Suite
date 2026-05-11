import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

export async function DELETE(
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

    if (backup.filePath && fs.existsSync(backup.filePath)) {
      await fs.promises.unlink(backup.filePath);
    }

    await prisma.backupLog.deleteMany({ where: { backupId: id } });
    await prisma.backupRestore.deleteMany({ where: { backupId: id } });
    await prisma.backup.delete({ where: { id } });

    await ActivityLogger.log({
      userId: session.user.id,
      action: "BACKUP_DELETED",
      actionType: "DELETE",
      entityType: "BACKUP",
      entityId: id,
      description: `Deleted backup: ${backup.name}`,
      metadata: { backupName: backup.name, backupType: backup.type, backupSize: backup.size },
    });

    return NextResponse.json({ success: true, message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
