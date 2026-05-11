// app/api/admin/users/[id]/activities/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  req: Request,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build date filter
    let startDate: Date;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
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
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
      }
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch all activities for the user in date range
    const activities = await prisma.userActivity.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate basic stats
    const totalActivities = activities.length;
    const totalCreditsUsed = activities.reduce((sum, a) => sum + (a.creditsUsed || 0), 0);
    const averageCreditsPerAction = totalActivities > 0 ? totalCreditsUsed / totalActivities : 0;

    // Find most frequent action
    const actionCounts: Record<string, number> = {};
    activities.forEach(a => {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    });
    
    let mostFrequentAction = "N/A";
    let maxCount = 0;
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentAction = action;
      }
    });

    // Calculate activity by type
    const activityByType: Record<string, number> = {};
    activities.forEach(a => {
      activityByType[a.actionType] = (activityByType[a.actionType] || 0) + 1;
    });

    // Calculate credits by action
    const creditsByAction: Record<string, number> = {};
    activities.forEach(a => {
      creditsByAction[a.action] = (creditsByAction[a.action] || 0) + (a.creditsUsed || 0);
    });

    // Calculate daily activity
    const dailyMap = new Map<string, { count: number; credits: number }>();
    activities.forEach(a => {
      const day = a.createdAt.toISOString().split("T")[0];
      const existing = dailyMap.get(day);
      if (existing) {
        existing.count++;
        existing.credits += (a.creditsUsed || 0);
      } else {
        dailyMap.set(day, { count: 1, credits: (a.creditsUsed || 0) });
      }
    });

    const dailyActivity = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, count: data.count, credits: data.credits }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate hourly distribution
    const hourlyMap = new Array(24).fill(0);
    activities.forEach(a => {
      const hour = a.createdAt.getHours();
      hourlyMap[hour]++;
    });

    const hourlyDistribution = hourlyMap.map((count, hour) => ({ hour, count }));

    // Find most active day
    let mostActiveDay = "N/A";
    let maxDailyCount = 0;
    dailyActivity.forEach(day => {
      if (day.count > maxDailyCount) {
        maxDailyCount = day.count;
        mostActiveDay = day.date;
      }
    });

    // Calculate action distribution by entity type
    const actionByEntity: Record<string, number> = {};
    activities.forEach(a => {
      actionByEntity[a.entityType] = (actionByEntity[a.entityType] || 0) + 1;
    });

    // Calculate credits trend (last 7 days)
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    const creditsTrend = last7Days.map(day => {
      const dayActivity = dailyActivity.find(d => d.date === day);
      return {
        date: day,
        credits: dayActivity?.credits || 0,
        activities: dayActivity?.count || 0,
      };
    });

    // Calculate session data (group by approximate sessions - 30 min inactivity)
    let sessions = 0;
    let lastActivityTime: Date | null = null;
    for (const activity of activities) {
      if (!lastActivityTime) {
        sessions++;
        lastActivityTime = activity.createdAt;
      } else {
        const timeDiff = (activity.createdAt.getTime() - lastActivityTime.getTime()) / (1000 * 60);
        if (timeDiff > 30) {
          sessions++;
        }
        lastActivityTime = activity.createdAt;
      }
    }

    // Calculate average session duration
    let avgSessionDuration = 0;
    if (sessions > 0 && activities.length > 0) {
      const firstActivity = activities[0];
      const lastActivity = activities[activities.length - 1];
      const totalDuration = (lastActivity.createdAt.getTime() - firstActivity.createdAt.getTime()) / (1000 * 60);
      avgSessionDuration = totalDuration / sessions;
    }

    const stats = {
      totalActivities,
      totalCreditsUsed,
      averageCreditsPerAction: Math.round(averageCreditsPerAction * 100) / 100,
      mostFrequentAction,
      mostActiveDay: mostActiveDay !== "N/A" ? mostActiveDay : "N/A",
      activityByType,
      creditsByAction,
      dailyActivity,
      hourlyDistribution,
      actionByEntity,
      creditsTrend,
      sessions,
      avgSessionDuration: Math.round(avgSessionDuration),
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    return NextResponse.json({ stats });
    
  } catch (error) {
    console.error("Error fetching user activity stats:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}