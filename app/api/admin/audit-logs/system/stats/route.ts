// app/api/admin/audit/system/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const where: any = {
      actionType: "SYSTEM",
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    const [
      totalEvents,
      successEvents,
      failureEvents,
      warningEvents,
      infoEvents,
      eventsByComponent,
    ] = await Promise.all([
      prisma.userActivity.count({ where }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["status"], equals: "SUCCESS" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["status"], equals: "FAILURE" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["status"], equals: "WARNING" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["status"], equals: "INFO" },
        },
      }),
      prisma.userActivity.groupBy({
        by: ["metadata"],
        where,
        _count: true,
      }),
    ]);

    // Calculate average response time
    const durationEvents = await prisma.userActivity.findMany({
      where: {
        ...where,
        metadata: { path: ["duration"], not: null },
      },
      select: {
        metadata: true,
      },
      take: 1000,
    });

    let totalDuration = 0;
    let durationCount = 0;
    for (const event of durationEvents) {
      if ((event.metadata as any)?.duration) {
        totalDuration += (event.metadata as any)?.duration;
        durationCount++;
      }
    }
    const avgResponseTime = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    // Get component counts
    const allEvents = await prisma.userActivity.findMany({
      where,
      select: {
        metadata: true,
      },
    });

    const componentCounts: Record<string, number> = {};
    for (const event of allEvents) {
      const comp = (event.metadata as any)?.component || "unknown";
      componentCounts[comp] = (componentCounts[comp] || 0) + 1;
    }

    // Determine health status based on failure rate
    const failureRate = totalEvents > 0 ? (failureEvents / totalEvents) * 100 : 0;
    const databaseHealth = failureRate < 5 ? "healthy" : failureRate < 10 ? "degraded" : "unhealthy";
    const cacheHealth = "healthy";
    const storageHealth = "healthy";

    return NextResponse.json({
      stats: {
        totalEvents,
        successEvents,
        failureEvents,
        warningEvents,
        infoEvents,
        avgResponseTime,
        uptime: 99.9,
        databaseHealth,
        cacheHealth,
        storageHealth,
        componentDistribution: componentCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching system audit stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}