import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const backupId = searchParams.get("backupId");
    const level = searchParams.get("level");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};
    if (backupId) where.backupId = backupId;
    if (level) where.level = level.toUpperCase();

    const [logs, total] = await Promise.all([
      prisma.backupLog.findMany({
        where,
        include: {
          backup: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.backupLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { limit, offset, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching backup logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
