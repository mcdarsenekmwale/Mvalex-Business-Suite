// app/api/admin/audit/users/stats/route.ts
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { NextRequest, NextResponse } from "next/server";
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
      actionType: { in: ["CREATE", "UPDATE", "DELETE", "SUSPEND", "ACTIVATE"] },
    };
    
    if (startDate) {
      where.createdAt = { gte: startDate };
    }
    
    const [
      totalEvents,
      created,
      updated,
      deleted,
      suspended,
      activated,
      roleChanges,
      uniqueUsers,
    ] = await Promise.all([
      prisma.userActivity.count({ where }),
      prisma.userActivity.count({
        where: { ...where, action: { contains: "CREATE", mode: "insensitive" } },
      }),
      prisma.userActivity.count({
        where: { ...where, action: { contains: "UPDATE", mode: "insensitive" } },
      }),
      prisma.userActivity.count({
        where: { ...where, action: { contains: "DELETE", mode: "insensitive" } },
      }),
      prisma.userActivity.count({
        where: { ...where, action: { contains: "SUSPEND", mode: "insensitive" } },
      }),
      prisma.userActivity.count({
        where: { ...where, action: { contains: "ACTIVATE", mode: "insensitive" } },
      }),
      prisma.userActivity.count({
        where: { ...where, action: { contains: "ROLE", mode: "insensitive" } },
      }),
      prisma.userActivity.groupBy({
        by: ["userId"],
        where,
        _count: true,
      }).then(result => result.length),
    ]);
    
    // Get daily activity trend
    const dailyActivity = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "UserActivity"
      WHERE "actionType" IN ('CREATE', 'UPDATE', 'DELETE', 'SUSPEND', 'ACTIVATE')
      ${startDate ? `AND "createdAt" >= ${startDate.toISOString()}` : ""}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `;
    
    return NextResponse.json({
      stats: {
        totalEvents,
        created,
        updated,
        deleted,
        suspended,
        activated,
        roleChanges,
        uniqueUsers,
        dailyTrend: dailyActivity.map(day => ({
          date: day.date,
          count: Number(day.count),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching user audit stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}