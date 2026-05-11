// app/api/user/dashboard/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DashboardStats {
  businessCards: number;
  invoices: number;
  logos: number;
  exports: number;
  credits: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  totalBusinessCards: number;
  totalInvoices: number;
  totalLogos: number;
  totalExports: number;
  totalRevenue: number;
  recentUsers: {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
    status: string;
    creditsBalance: number;
  }[];
  ticketsSummary: {
    status: string;
    count: number;
  }[];
  recentTickets: any[];
  userGrowth: Array<{ month: string; count: number }>;
  revenueTrend: Array<{ month: string; revenue: number }>;
  popularActions: Array<{ action: string; count: number; revenue: number }>;
}

interface AgentDashboard {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  myAssignedTickets: number;
  totalTickets: number;
  recentTickets: any[];
  ticketsByPriority: {
    priority: string;
    count: number;
  }[];
  avgResponseTime: number;
  satisfactionRate: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  admin?: AdminDashboard;
  agent?: AgentDashboard;
  recentAssets: any[];
  creditTransactions: CreditTransaction[];
  monthlyActivity: {
    type: string;
    count: number;
    creditsUsed: number;
  }[];
  quickActions?: {
    label: string;
    href: string;
    icon: string;
  }[];
}

// Helper function to check user roles
async function hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: {
            role: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    if (!user) return false;
    
    return user.roles.some(userRole => 
      roleNames.includes(userRole.role.name)
    );
  } catch (error) {
    console.error("Error checking user roles:", error);
    return false;
  }
}

// Helper function to get user roles
async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: {
            role: { select: { name: true } }
          }
        }
      }
    });
    
    if (!user) return [];
    
    return user.roles.map(userRole => userRole.role.name);
  } catch (error) {
    console.error("Error getting user roles:", error);
    return [];
  }
}

// Dashboard data
export async function GET(req: Request) {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get actual user roles from database
    const userRoles = await getUserRoles(userId);
    const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
    const isAgent = userRoles.includes("AGENT") || userRoles.includes("SUPPORT_AGENT");
    const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
    
    // Get user's credit balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsBalance: true, name: true, email: true, avatarUrl: true }
    });
    
    const creditsBalance = user?.creditsBalance || 0;

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User dashboard data - Common for all users
    const [
      businessCardsCount,
      invoicesCount,
      logosCount,
      exportsCount,
      businessCards,
      invoices,
      logos,
      creditTransactions,
      monthlyStats,
      totalCreditsUsed,
      totalCreditsAdded,
    ] = await Promise.all([
      prisma.businessCard.count({ where: { userId } }),
      prisma.invoice.count({ where: { userId } }),
      prisma.logo.count({ where: { userId } }),
      prisma.export.count({ where: { userId } }),
      // Recent business cards with more details
      prisma.businessCard.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, createdAt: true, name: true, template: true, frontConfig: true }
      }),
      // Recent invoices with more details
      prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, createdAt: true, invoiceNumber: true, clientName: true, currency: true, status: true , amountPaid: true}
      }),
      // Recent logos with more details
      prisma.logo.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, createdAt: true, businessName: true, style: true, variations: true }
      }),
      // Credit transaction history
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          type: true,
          action: true,
          description: true,
          createdAt: true,
          balanceAfter: true,
        }
      }),
      // Monthly activity stats (last 30 days)
      prisma.creditTransaction.groupBy({
        by: ["action"],
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { action: true },
        _sum: { amount: true },
      }),
      // Total credits used all time
      prisma.creditTransaction.aggregate({
        where: { userId, type: "CREDIT_DEDUCT" },
        _sum: { amount: true },
      }),
      // Total credits added all time
      prisma.creditTransaction.aggregate({
        where: { userId, type: "CREDIT_ADD" },
        _sum: { amount: true },
      }),
    ]);

    // Format recent assets with proper names and thumbnails
    const formattedRecentAssets: any[] = [
      ...businessCards.map(asset => ({ 
        id: asset.id, 
        type: "BUSINESS_CARD", 
        name: asset.name || "Untitled Business Card", 
        createdAt: asset.createdAt,
        thumbnail: asset.frontConfig || undefined
      })),
      ...invoices.map(asset => ({ 
        id: asset.id, 
        type: "INVOICE", 
        name: asset.invoiceNumber || `Invoice to ${asset.clientName || "Client"}`, 
        createdAt: asset.createdAt,
        thumbnail: undefined
      })),
      ...logos.map(asset => ({ 
        id: asset.id, 
        type: "LOGO", 
        name: asset.businessName || "Untitled Logo", 
        createdAt: asset.createdAt,
        thumbnail: asset.variations?.[0]?.imageUrl || undefined
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

    // Build dashboard response
    const dashboard: DashboardResponse = {
      stats: {
        businessCards: businessCardsCount,
        invoices: invoicesCount,
        logos: logosCount,
        exports: exportsCount,
        credits: creditsBalance,
      },
      recentAssets: formattedRecentAssets,
      creditTransactions: creditTransactions as any,
      monthlyActivity: monthlyStats.map((stat: any) => ({
        type: stat.action,
        count: stat._count.action,
        creditsUsed: Math.abs(stat._sum.amount || 0),
      })),
      quickActions: [
        { label: "Create Business Card", href: "/dashboard/business-cards/new", icon: "CreditCard" },
        { label: "Generate Invoice", href: "/dashboard/invoices/new", icon: "FileText" },
        { label: "Create AI Logo", href: "/dashboard/logos/new", icon: "Palette" },
        { label: "View Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
      ],
    };

    // Admin dashboard data - Only for ADMIN and SUPER_ADMIN
    if (isAdmin) {
      // Get user growth over last 6 months
      const userGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const count = await prisma.user.count({
          where: { createdAt: { lt: nextMonth } }
        });
        userGrowth.push({
          month: monthDate.toLocaleString('default', { month: 'short' }),
          count
        });
      }

      // Get revenue trend over last 6 months
      const revenueTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const revenue = await prisma.creditTransaction.aggregate({
          where: {
            type: "CREDIT_DEDUCT",
            createdAt: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        });
        revenueTrend.push({
          month: monthStart.toLocaleString('default', { month: 'short' }),
          revenue: revenue._sum.amount || 0
        });
      }

      // Get popular actions
      const popularActions = await prisma.creditTransaction.groupBy({
        by: ["action"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { action: true },
        _sum: { amount: true },
        orderBy: { _count: { action: "desc" } },
        take: 5,
      });

      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        pendingUsers,
        totalBusinessCards,
        totalInvoices,
        totalLogos,
        totalExports,
        totalRevenue,
        recentUsers,
        ticketsSummary,
        recentTickets,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { status: "SUSPENDED" } }),
        prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
        prisma.businessCard.count(),
        prisma.invoice.count(),
        prisma.logo.count(),
        prisma.export.count(),
        prisma.creditTransaction.aggregate({
          where: { type: "CREDIT_DEDUCT" },
          _sum: { amount: true },
        }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { 
            id: true, 
            name: true, 
            email: true, 
            createdAt: true, 
            status: true,
            creditsBalance: true,
          },
        }),
        prisma.supportTicket.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.supportTicket.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: { select: { name: true, email: true } },
            messages: { select: { createdAt: true, isAdmin: true } },
            
          }
        }),
      ]);
      
      dashboard.admin = {
        totalUsers,
        activeUsers,
        suspendedUsers,
        pendingUsers,
        totalBusinessCards,
        totalInvoices,
        totalLogos,
        totalExports,
        totalRevenue: totalRevenue._sum.amount || 0,
        recentUsers,
        ticketsSummary: ticketsSummary.map((t: any) => ({
          status: t.status,
          count: t._count.status,
        })),
        recentTickets,
        userGrowth,
        revenueTrend,
        popularActions: popularActions.map((p: any) => ({
          action: p.action,
          count: p._count.action,
          revenue: Math.abs(p._sum.amount || 0),
        })),
      };
    }
    
    // Agent dashboard data - For support agents
    if (isAgent && !isSuperAdmin) {
      // Calculate average response time
      const ticketsWithResponses = await prisma.supportTicket.findMany({
        where: {
          messages: { some: { isAdmin: true } }
        },
        select: {
          createdAt: true,
          messages: {
            where: { isAdmin: true },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true }
          }
        },
        take: 100,
      });

      let totalResponseMinutes = 0;
      let ticketsWithResponseCount = 0;
      for (const ticket of ticketsWithResponses) {
        if (ticket.messages[0]) {
          const responseTime = (ticket.messages[0].createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
          totalResponseMinutes += responseTime;
          ticketsWithResponseCount++;
        }
      }
      const avgResponseTime = ticketsWithResponseCount > 0 ? Math.round(totalResponseMinutes / ticketsWithResponseCount) : 0;

      // Calculate satisfaction rate (mock - would come from feedback)
      const satisfactionRate = 94;

      const [
        openTickets,
        inProgressTickets,
        resolvedTickets,
        myAssignedTickets,
        recentTickets,
        ticketsByPriority,
      ] = await Promise.all([
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
        prisma.supportTicket.count({ 
          where: { 
            status: "RESOLVED", 
            resolvedAt: { gte: sevenDaysAgo } 
          } 
        }),
        prisma.supportTicket.count({ 
          where: { 
            assignedTo: userId, 
            status: { notIn: ["RESOLVED", "CLOSED"] } 
          } 
        }),
        prisma.supportTicket.findMany({
          where: { OR: [{ assignedTo: userId }, { status: "OPEN" }] },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } }
          }
        }),
        prisma.supportTicket.groupBy({
          by: ["priority"],
          _count: { priority: true },
          where: { status: { notIn: ["RESOLVED", "CLOSED"] } }
        }),
      ]);
      
      dashboard.agent = {
        openTickets,
        inProgressTickets,
        resolvedTickets,
        myAssignedTickets,
        totalTickets: openTickets + inProgressTickets,
        recentTickets,
        ticketsByPriority: ticketsByPriority.map((t: any) => ({
          priority: t.priority,
          count: t._count.priority,
        })),
        avgResponseTime,
        satisfactionRate,
      };
    }

    return NextResponse.json({
      success: true,
      data: dashboard,
      user: {
        id: userId,
        name: user?.name,
        email: user?.email,
        avatarUrl: user?.avatarUrl,
        roles: userRoles,
        isAdmin,
        isAgent,
        isSuperAdmin,
      }
    });
    
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}