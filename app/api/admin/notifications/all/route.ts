import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [notifications, total, unread, sentToday] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }).catch(() => []),
      prisma.notification.count().catch(() => 0),
      prisma.notification.count({ where: { isRead: false } }).catch(() => 0),
      prisma.notification.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
    ]);

    return NextResponse.json({
      notifications,
      stats: { total, unread, sentToday },
    });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
