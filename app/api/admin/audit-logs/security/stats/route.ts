// app/api/admin/audit/security/stats/route.ts
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
      actionType: "SECURITY",
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    const [
      totalEvents,
      criticalEvents,
      highEvents,
      mediumEvents,
      lowEvents,
      failedLogins,
      successfulLogins,
      roleChanges,
      permissionChanges,
      loginAttemptsByHour,
    ] = await Promise.all([
      prisma.userActivity.count({ where }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["severity"], equals: "CRITICAL" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["severity"], equals: "HIGH" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["severity"], equals: "MEDIUM" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          metadata: { path: ["severity"], equals: "LOW" },
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          action: "LOGIN_FAILURE",
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          action: "LOGIN_SUCCESS",
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          action: "ROLE_CHANGED",
        },
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          action: "PERMISSION_CHANGED",
        },
      }),
      prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT 
          EXTRACT(HOUR FROM "createdAt") as hour,
          COUNT(*) as count
        FROM "UserActivity"
        WHERE "actionType" = 'SECURITY'
        ${startDate ? `AND "createdAt" >= ${startDate.toISOString()}` : ""}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY hour ASC
      `,
    ]);

    // Get unique users and IPs
    const [uniqueUsersResult, uniqueIPsResult] = await Promise.all([
      prisma.userActivity.groupBy({
        by: ["userId"],
        where,
        _count: true,
      }),
      prisma.userActivity.groupBy({
        by: ["ipAddress"],
        where: { ...where, ipAddress: { not: null } },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalEvents,
        criticalEvents,
        highEvents,
        mediumEvents,
        lowEvents,
        failedLogins,
        successfulLogins,
        roleChanges,
        permissionChanges,
        uniqueUsers: uniqueUsersResult.length,
        uniqueIPs: uniqueIPsResult.length,
        loginAttemptsByHour: loginAttemptsByHour.map(item => ({
          hour: Number(item.hour),
          count: Number(item.count),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching security audit stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}