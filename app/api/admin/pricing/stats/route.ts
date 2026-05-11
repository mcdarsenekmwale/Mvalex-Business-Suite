// app/api/admin/pricing/stats/route.ts
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

    const { startDate } = getDateRange(dateRange);

    const rules = await prisma.pricingRule.findMany();
    const activeRules = rules.filter(r => r.isActive);
    
    const averageCost = rules.length > 0 
      ? Math.round(rules.reduce((sum, r) => sum + r.cost, 0) / rules.length)
      : 0;

    // Calculate revenue and usage from transactions
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        type: "CREDIT_DEDUCT",
        createdAt: { gte: startDate },
      },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCreditsUsed = totalRevenue;

    // Find most used action
    const actionUsage = new Map<string, number>();
    transactions.forEach((t: any) => {
      actionUsage.set(t.action, (actionUsage.get(t.action) || 0) + 1);
    });
    
    let mostUsedAction = "N/A";
    let highestRevenueAction = "N/A";
    let maxUsage = 0;
    let maxRevenue = 0;
    
    actionUsage.forEach((count, action) => {
      if (count > maxUsage) {
        maxUsage = count;
        mostUsedAction = action.replace(/_/g, " ");
      }
    });
    
    const actionRevenue = new Map<string, number>();
    transactions.forEach((t: any) => {
      actionRevenue.set(t.action, (actionRevenue.get(t.action) || 0) + t.amount);
    });
    
    actionRevenue.forEach((revenue, action) => {
      if (revenue > maxRevenue) {
        maxRevenue = revenue;
        highestRevenueAction = action.replace(/_/g, " ");
      }
    });

    const stats = {
      totalActions: rules.length,
      activeRules: activeRules.length,
      averageCost,
      totalRevenue,
      totalCreditsUsed,
      mostUsedAction,
      highestRevenueAction,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching pricing stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
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
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}