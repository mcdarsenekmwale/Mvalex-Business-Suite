// app/api/admin/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get dates for calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Fetch all stats in parallel with try-catch for each to prevent total failure
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersThisMonth,
      totalBusinessCards,
      totalInvoices,
      totalLogos,
      totalCreditsUsed,
      openTickets,
      inProgressTickets,
      newCardsThisMonth,
      newInvoicesThisMonth,
      newLogosThisMonth,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.user.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.user.count({ where: { status: "SUSPENDED" } }).catch(() => 0),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0),
      prisma.businessCard.count().catch(() => 0),
      prisma.invoice.count().catch(() => 0),
      prisma.logo.count().catch(() => 0),
      prisma.creditTransaction.aggregate({
        where: { type: "CREDIT_DEDUCT" },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      prisma.supportTicket.count({ where: { status: "OPEN" } }).catch(() => 0),
      prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }).catch(() => 0),
      prisma.businessCard.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0),
      prisma.invoice.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0),
      prisma.logo.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0),
    ]);

    // Get user growth data for last 6 months
    const userGrowthData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString("default", { month: "short" });
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const [totalUsersAtMonth, activeUsersAtMonth] = await Promise.all([
        prisma.user.count({
          where: { createdAt: { lt: nextMonth } },
        }).catch(() => 0),
        prisma.user.count({
          where: {
            status: "ACTIVE",
            createdAt: { lt: nextMonth },
          },
        }).catch(() => 0),
      ]);
      
      userGrowthData.push({
        name: monthName,
        users: totalUsersAtMonth,
        active: activeUsersAtMonth,
      });
    }

    // Get weekly activity data
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayName = day.toLocaleString("default", { weekday: "short" });
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      const [cards, invoices, logos] = await Promise.all([
        prisma.businessCard.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }).catch(() => 0),
        prisma.invoice.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }).catch(() => 0),
        prisma.logo.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }).catch(() => 0),
      ]);
      
      weeklyActivity.push({
        name: dayName,
        cards,
        invoices,
        logos,
      });
    }

    // Get role distribution using Prisma ORM instead of raw SQL
    let roleDistribution: Array<{ name: string; value: number }> = [];
    
    try {
      // Try to get roles using Prisma relations
      const usersWithRoles = await prisma.user.findMany({
        select: {
          roles: {
            select: {
              role: {
                select: {
                  type: true,
                },
              },
            },
          },
        },
      });

      // Count roles manually
      const roleCounts: Record<string, number> = {};
      usersWithRoles.forEach(user => {
        user.roles.forEach(userRole => {
          const roleType = userRole.role.type;
          roleCounts[roleType] = (roleCounts[roleType] || 0) + 1;
        });
      });

      // Users without roles get default USER role
      const usersWithoutRoles = usersWithRoles.filter(user => user.roles.length === 0).length;
      if (usersWithoutRoles > 0) {
        roleCounts["USER"] = (roleCounts["USER"] || 0) + usersWithoutRoles;
      }

      roleDistribution = Object.entries(roleCounts).map(([name, value]) => ({
        name,
        value,
      }));
    } catch (error) {
      console.error("Error fetching role distribution:", error);
      // Fallback: Get users by role from User table if it has a role field
      try {
        const adminCount = await prisma.userRole.count({ where: { role: { type: "ADMIN" } } }).catch(() => 0);
        const superAdminCount = await prisma.userRole.count({ where: { role: { type: "SUPER_ADMIN" } } }).catch(() => 0);
        const userCount = totalUsers - adminCount - superAdminCount - suspendedUsers;
        
        roleDistribution = [
          { name: "USER", value: userCount },
          { name: "ADMIN", value: adminCount },
          { name: "SUPER_ADMIN", value: superAdminCount },
        ];
      } catch (fallbackError) {
        console.error("Fallback role distribution also failed:", fallbackError);
        roleDistribution = [
          { name: "USER", value: totalUsers - suspendedUsers },
          { name: "ADMIN", value: 0 },
          { name: "SUPER_ADMIN", value: 0 },
        ];
      }
    }

    const roleColors: Record<string, string> = {
      USER: "#3b82f6",
      ADMIN: "#8b5cf6",
      SUPER_ADMIN: "#f59e0b",
      SUSPENDED: "#ef4444",
    };

    const roleDistributionWithColors = roleDistribution
      .filter(r => r.name !== "SUSPENDED")
      .map(r => ({
        name: r.name === "USER" ? "Users" : r.name === "ADMIN" ? "Admins" : "Super Admins",
        value: Number(r.value),
        color: roleColors[r.name] || "#64748b",
      }));

    // Add suspended users
    if (suspendedUsers > 0) {
      roleDistributionWithColors.push({
        name: "Suspended",
        value: suspendedUsers,
        color: "#ef4444",
      });
    }

    // Calculate total exports (if Export table exists, otherwise estimate)
    let totalExports = 0;
    try {
      totalExports = await prisma.export.count().catch(() => 0);
    } catch {
      // Export table might not exist yet
      totalExports = totalBusinessCards + totalInvoices + totalLogos;
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalBusinessCards,
        totalInvoices,
        totalLogos,
        totalExports,
        totalCreditsUsed: totalCreditsUsed._sum.amount || 0,
        openTickets,
        inProgressTickets,
        newUsersThisMonth,
        newCardsThisMonth,
        newInvoicesThisMonth,
        newLogosThisMonth,
      },
      userGrowth: userGrowthData,
      weeklyActivity,
      roleDistribution: roleDistributionWithColors,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}