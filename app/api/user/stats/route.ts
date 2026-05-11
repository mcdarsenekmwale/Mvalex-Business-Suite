// app/api/user/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsBalance: true },
    });

    // Get counts
    const [
      businessCardsCount,
      invoicesCount,
      logosCount,
      exportsCount,
      totalActivities,
      creditStats,
    ] = await Promise.all([
      prisma.businessCard.count({ where: { userId } }),
      prisma.invoice.count({ where: { userId } }),
      prisma.logo.count({ where: { userId } }),
      prisma.export.count({ where: { userId } }),
      prisma.userActivity.count({ where: { userId } }),
      prisma.creditTransaction.groupBy({
        by: ["type"],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    // Get activities by type
    const activitiesByType = await prisma.userActivity.groupBy({
      by: ["entityType"],
      where: { userId },
      _count: true,
    });

    // Get credits by action
    const creditsByAction = await prisma.creditTransaction.groupBy({
      by: ["action"],
      where: { userId, type: "CREDIT_DEDUCT" },
      _sum: { amount: true },
    });

    // Get weekly activity
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const [activitiesCount, creditsUsed] = await Promise.all([
        prisma.userActivity.count({
          where: {
            userId,
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.creditTransaction.aggregate({
          where: {
            userId,
            type: "CREDIT_DEDUCT",
            createdAt: { gte: date, lt: nextDate },
          },
          _sum: { amount: true },
        }),
      ]);
      
      weeklyActivity.push({
        date: date.toISOString(),
        count: activitiesCount,
        credits: creditsUsed._sum.amount || 0,
      });
    }

    const totalCreditsUsed = creditStats.find(c => c.type === "CREDIT_DEDUCT")?._sum?.amount || 0;
    const totalCreditsAdded = creditStats.find(c => c.type === "CREDIT_ADD")?._sum?.amount || 0;

    const activitiesByTypeMap: Record<string, number> = {};
    activitiesByType.forEach(item => {
      activitiesByTypeMap[item.entityType] = item._count;
    });

    const creditsByActionMap: Record<string, number> = {};
    creditsByAction.forEach((item: any) => {
      creditsByActionMap[item.action] = item._sum?.amount || 0;
    });

    return NextResponse.json({
      stats: {
        currentBalance: user?.creditsBalance || 0,
        totalCreditsUsed,
        totalCreditsAdded,
        businessCardsCount,
        invoicesCount,
        logosCount,
        exportsCount,
        totalActivities,
        activitiesByType: activitiesByTypeMap,
        creditsByAction: creditsByActionMap,
        weeklyActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}