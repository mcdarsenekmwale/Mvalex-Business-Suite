import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, UserRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { SessionStore } from "@/lib/session/session-store";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalActiveSessions,
      totalExpiredSessions,
      newSessionsToday,
      uniqueUsers,
      sessionsByDevice,
      sessionsByBrowser,
      averageSessionDuration,
    ] = await Promise.all([
      prisma.session.count({ where: { expires: { gt: now } } }),
      prisma.session.count({ where: { expires: { lt: now } } }),
      prisma.session.count({ where: { expires: { gt: now } } }),
      prisma.session
        .groupBy({ by: ["userId"] })
        .then((groups) => groups.length),
      SessionStore.getDeviceStats(),
      SessionStore.getBrowserStats(),
      SessionStore.getAverageSessionDuration(),
    ]);

    return NextResponse.json({
      stats: {
        totalActiveSessions,
        totalExpiredSessions,
        newSessionsToday,
        uniqueUsers,
        sessionsByDevice,
        sessionsByBrowser,
        averageSessionDuration,
      },
    });
  } catch (error) {
    console.error("Error fetching session stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
