// app/api/admin/pricing/analytics/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface UsageByAction {
  action: string;
  label: string;
  uses: number;
  revenue: number;
  color: string;
}

interface RevenueByMonth {
  month: string;
  revenue: number;
  creditsUsed: number;
}

interface ActionDistribution {
  name: string;
  value: number;
  color: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_BUSINESS_CARD: "Create Business Card",
  EDIT_BUSINESS_CARD: "Edit Business Card",
  DELETE_BUSINESS_CARD: "Delete Business Card",
  CREATE_INVOICE: "Create Invoice",
  EDIT_INVOICE: "Edit Invoice",
  DELETE_INVOICE: "Delete Invoice",
  GENERATE_LOGO: "Generate Logo",
  GENERATE_LOGO_VARIATIONS: "Logo Variations",
  EXPORT_BUSINESS_CARD_PNG: "Export Card (PNG)",
  EXPORT_BUSINESS_CARD_PDF: "Export Card (PDF)",
  EXPORT_BUSINESS_CARD_DOCX: "Export Card (DOCX)",
  EXPORT_INVOICE_PDF: "Export Invoice (PDF)",
  EXPORT_INVOICE_EXCEL: "Export Invoice (Excel)",
  EXPORT_LOGO_PNG: "Export Logo (PNG)",
  EXPORT_LOGO_SVG: "Export Logo (SVG)",
  EXPORT_LOGO_PDF: "Export Logo (PDF)",
  AI_CHAT_MESSAGE: "AI Chat Message",
  AI_DESIGN_SUGGESTION: "AI Design Suggestion",
  PREMIUM_TEMPLATE: "Premium Template",
  BULK_EXPORT: "Bulk Export",
  AI_ADVANCED_GENERATION: "AI Advanced Generation",
  CUSTOM_BRANDING: "Custom Branding",
  PRIORITY_SUPPORT: "Priority Support",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_BUSINESS_CARD: "#3b82f6",
  EDIT_BUSINESS_CARD: "#60a5fa",
  CREATE_INVOICE: "#10b981",
  EDIT_INVOICE: "#34d399",
  GENERATE_LOGO: "#8b5cf6",
  GENERATE_LOGO_VARIATIONS: "#a78bfa",
  EXPORT_BUSINESS_CARD_PNG: "#f59e0b",
  EXPORT_BUSINESS_CARD_PDF: "#fbbf24",
  EXPORT_INVOICE_PDF: "#f59e0b",
  EXPORT_INVOICE_EXCEL: "#10b981",
  AI_CHAT_MESSAGE: "#06b6d4",
  AI_DESIGN_SUGGESTION: "#22d3ee",
  PREMIUM_TEMPLATE: "#ec4899",
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "month";

    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch all credit transactions in date range
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        type: "CREDIT_DEDUCT",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        action: true,
        amount: true,
        createdAt: true,
        userId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch pricing rules for cost reference
    const pricingRules = await prisma.pricingRule.findMany({
      where: { isActive: true },
      select: {
        action: true,
        cost: true,
        description: true,
      },
    });

    // Create a map for quick cost lookup
    const costMap = new Map<string, number>();
    pricingRules.forEach((rule: any) => {
      costMap.set(rule.action || "", rule.cost || 0);
    });

    // 1. Calculate usage by action
    const usageByActionMap = new Map<string, { uses: number; revenue: number }>();
    
    transactions.forEach((transaction: any) => {
      const existing = usageByActionMap.get(transaction.action || "");
      if (existing) {
        existing.uses++;
        existing.revenue += transaction.amount;
      } else {
        usageByActionMap.set(transaction.action || "", {
          uses: 1,
          revenue: transaction.amount,
        });
      }
    });

    // Convert to array with labels and colors
    const usageByAction: UsageByAction[] = [];
    usageByActionMap.forEach((value, action) => {
      usageByAction.push({
        action,
        label: ACTION_LABELS[action] || action.replace(/_/g, " "),
        uses: value.uses,
        revenue: value.revenue,
        color: ACTION_COLORS[action] || "#64748b",
      });
    });

    // Sort by usage descending
    usageByAction.sort((a, b) => b.uses - a.uses);

    // 2. Calculate revenue by month
    const revenueByMonthMap = new Map<string, { revenue: number; creditsUsed: number }>();
    
    transactions.forEach(transaction => {
      const monthKey = formatMonthKey(transaction.createdAt);
      const existing = revenueByMonthMap.get(monthKey);
      if (existing) {
        existing.revenue += transaction.amount;
        existing.creditsUsed += transaction.amount;
      } else {
        revenueByMonthMap.set(monthKey, {
          revenue: transaction.amount,
          creditsUsed: transaction.amount,
        });
      }
    });

    // Generate all months in date range
    const revenueByMonth: RevenueByMonth[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthKey = formatMonthKey(currentDate);
      const data = revenueByMonthMap.get(monthKey) || { revenue: 0, creditsUsed: 0 };
      revenueByMonth.push({
        month: formatMonthLabel(currentDate),
        revenue: data.revenue,
        creditsUsed: data.creditsUsed,
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // 3. Calculate action distribution for pie chart (top 8 actions)
    const actionDistribution: ActionDistribution[] = [];
    const topActions = usageByAction.slice(0, 7);
    const otherActions = usageByAction.slice(7);
    
    topActions.forEach(action => {
      actionDistribution.push({
        name: action.label,
        value: action.uses,
        color: action.color,
      });
    });
    
    if (otherActions.length > 0) {
      const otherTotal = otherActions.reduce((sum, a) => sum + a.uses, 0);
      actionDistribution.push({
        name: "Other",
        value: otherTotal,
        color: "#94a3b8",
      });
    }

    // 4. Calculate additional insights
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Calculate unique users who performed actions
    const uniqueUsers = new Set(transactions.map(t => t.userId)).size;
    
    // Calculate peak usage hours
    const usageByHour = new Array(24).fill(0);
    transactions.forEach(transaction => {
      const hour = new Date(transaction.createdAt).getHours();
      usageByHour[hour]++;
    });
    
    const peakHour = usageByHour.indexOf(Math.max(...usageByHour));
    const peakHourUsage = Math.max(...usageByHour);
    
    // Calculate daily average
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = daysDiff > 0 ? totalRevenue / daysDiff : 0;
    
    // Find most popular action
    const mostPopularAction = usageByAction.length > 0 ? usageByAction[0].label : "N/A";
    const mostPopularActionCount = usageByAction.length > 0 ? usageByAction[0].uses : 0;
    
    // Find highest revenue action
    const highestRevenueAction = [...usageByAction].sort((a, b) => b.revenue - a.revenue)[0];
    
    // Calculate growth trends (compare current period with previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - getMonthDifference(startDate, endDate));
    const previousPeriodEnd = new Date(startDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    
    const previousTransactions = await prisma.creditTransaction.findMany({
      where: {
        type: "CREDIT_DEDUCT",
        createdAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });
    
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + t.amount, 0);
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    return NextResponse.json({
      usageByAction,
      revenueByMonth,
      actionDistribution,
      insights: {
        totalTransactions,
        totalRevenue,
        averageTransactionValue: Math.round(averageTransactionValue),
        uniqueUsers,
        peakHour,
        peakHourUsage,
        dailyAverage: Math.round(dailyAverage),
        mostPopularAction,
        mostPopularActionCount,
        highestRevenueAction: highestRevenueAction?.label || "N/A",
        highestRevenueAmount: highestRevenueAction?.revenue || 0,
        revenueGrowth: Math.round(revenueGrowth),
        periodDays: daysDiff,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
    
  } catch (error) {
    console.error("Error fetching pricing analytics:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
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
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }
  
  return { startDate, endDate };
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getMonthDifference(startDate: Date, endDate: Date): number {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
         (endDate.getMonth() - startDate.getMonth()) + 1;
}