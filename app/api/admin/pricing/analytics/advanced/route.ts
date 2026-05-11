// app/api/admin/pricing/analytics/advanced/route.ts (Optional - Advanced Analytics)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "month";

    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch all data in parallel for better performance
    const [transactions, users, pricingRules] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: {
          type: "CREDIT_DEDUCT",
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          action: true,
          amount: true,
          createdAt: true,
          userId: true,
        },
      }),
      prisma.user.count(),
      prisma.pricingRule.findMany({ where: { isActive: true } }),
    ]);

    // User retention analysis
    const userActivityMap = new Map<string, number>();
    transactions.forEach((t: any) => {
      userActivityMap.set(t.userId || "", (userActivityMap.get(t.userId || "") || 0) + 1);
    });
    
    const activeUsers = userActivityMap.size;
    const powerUsers = Array.from(userActivityMap.values()).filter(count => count > 50).length;
    const casualUsers = activeUsers - powerUsers;
    
    // Action efficiency (revenue per use)
    const actionEfficiency = new Map<string, number>();
    const actionUsage = new Map<string, number>();
    const actionRevenue = new Map<string, number>();
    
    transactions.forEach((t: any) => {
      actionUsage.set(t.action || "", (actionUsage.get(t.action || "") || 0) + 1);
      actionRevenue.set(t.action || "", (actionRevenue.get(t.action || "") || 0) + t.amount);
    });
    
    actionUsage.forEach((uses, action) => {
      const revenue = actionRevenue.get(action) || 0;
      actionEfficiency.set(action, revenue / uses);
    });
    
    // Top performing actions by efficiency
    const topEfficientActions = Array.from(actionEfficiency.entries())
      .map(([action, efficiency]) => ({
        action: ACTION_LABELS[action] || action,
        efficiency: Math.round(efficiency),
        totalRevenue: actionRevenue.get(action) || 0,
        totalUses: actionUsage.get(action) || 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);
    
    // Hourly heatmap data
    const hourlyData = new Array(24).fill(0).map(() => ({ hour: 0, count: 0, revenue: 0 }));
    transactions.forEach((t: any) => {
      const hour = new Date(t.createdAt || "").getHours();
      hourlyData[hour].hour = hour;
      hourlyData[hour].count++;
      hourlyData[hour].revenue += t.amount || 0;
    });
    
    // Weekly pattern analysis
    const weeklyData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => ({
      day,
      count: 0,
      revenue: 0,
    }));
    
    transactions.forEach((t: any) => {
      const dayOfWeek = new Date(t.createdAt || "").getDay();
      weeklyData[dayOfWeek].count++;
      weeklyData[dayOfWeek].revenue += t.amount || 0;
    });
    
    // Forecast next month usage (simple linear regression)
    const monthlyRevenue = await getMonthlyRevenueHistory(6);
    const forecast = calculateForecast(monthlyRevenue);
    
    return NextResponse.json({
      userSegmentation: {
        totalUsers: users || 0,
        activeUsers: activeUsers || 0,
        powerUsers: powerUsers || 0,
        casualUsers: casualUsers || 0,
        powerUserPercentage: activeUsers > 0 ? (powerUsers / activeUsers) * 100 : 0,
      },
      actionEfficiency: topEfficientActions,
      hourlyDistribution: hourlyData,
      weeklyDistribution: weeklyData,
      forecast: {
        nextMonthRevenue: Math.round(forecast),
        confidence: "medium",
        basedOnMonths: monthlyRevenue.length,
      },
      recommendations: generateRecommendations({
        topEfficientActions,
        activeUsers: activeUsers || 0,
        powerUsers: powerUsers || 0,
        casualUsers: casualUsers || 0,
        hourlyData: hourlyData || 0,
        weeklyData,
      }),
    });
    
  } catch (error) {
    console.error("Error fetching advanced analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getMonthlyRevenueHistory(months: number): Promise<number[]> {
  const revenueByMonth: number[] = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const transactions = await prisma.creditTransaction.aggregate({
      where: {
        type: "CREDIT_DEDUCT",
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    
    revenueByMonth.push(transactions._sum.amount || 0);
  }
  
  return revenueByMonth;
}

function calculateForecast(historicalData: number[]): number {
  if (historicalData.length < 2) return historicalData[0] || 0;
  
  // Simple linear regression
  const n = historicalData.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = historicalData.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * historicalData[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict next month (index = n)
  const forecast = slope * n + intercept;
  return Math.max(0, forecast);
}

function generateRecommendations(data: any): string[] {
  const recommendations = [];
  
  if (data.topEfficientActions.length > 0) {
    recommendations.push(`Focus marketing on ${data.topEfficientActions[0].action} - it generates ${data.topEfficientActions[0].efficiency} credits per use.`);
  }
  // Add null check for powerUsers and activeUsers
  if (data.powerUsers === undefined || data.activeUsers === undefined) {
    return [];
  }

  if (data.powerUsers < data.activeUsers * 0.2) {
    recommendations.push("Consider a loyalty program to convert casual users to power users.");
  }
  
  // Find peak hours
  const peakHour = data.hourlyData.reduce((max: any, curr: any) => 
    curr.count > max.count ? curr : max, data.hourlyData[0]);
  recommendations.push(`Peak usage at ${peakHour.hour}:00 - ensure system scalability during this time.`);
  
  // Find best day
  const bestDay = data.weeklyDistribution.reduce((max: any, curr: any) => 
    curr.revenue > max.revenue ? curr : max, data.weeklyDistribution[0]);
  recommendations.push(`${bestDay.day} is your highest revenue day (${bestDay.revenue.toLocaleString()} credits).`);
  
  return recommendations;
}

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  
  let startDate: Date;
  switch (range) {
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
  
  return { startDate, endDate };
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_BUSINESS_CARD: "Create Business Card",
  GENERATE_LOGO: "Generate Logo",
  CREATE_INVOICE: "Create Invoice",
  AI_CHAT_MESSAGE: "AI Chat",
  EXPORT_BUSINESS_CARD_PNG: "Export Card",
  // Add more as needed
};