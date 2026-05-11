/**
 * Admin-specific database queries
 * These are server-only functions for admin operations
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getDateRange } from "./helpers";

export interface UserFilterParams {
  search?: string;
  status?: string;
  role?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TicketFilterParams {
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  dateRange?: string;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Get paginated users with filters
 */
export async function getUsers(params: UserFilterParams = {}) {
  const {
    search,
    status,
    role,
    dateFrom,
    dateTo,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status as any;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  // Role filter requires joining through UserRole
  let users;
  let total;

  if (role) {
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (roleRecord) {
      where.roles = { some: { roleId: roleRecord.id } };
    }
  }

  const [data, count] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        roles: { include: { role: true } },
        _count: {
          select: {
            businessCards: true,
            invoices: true,
            logos: true,
            supportTickets: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get a single user with full details
 */
export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        creditsBalance: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        roles: {
          include: {
            role: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            businessCards: true,
            invoices: true,
            logos: true,
            exports: true,
            supportTickets: true,
          },
        },
      },
      
    });
}

/**
 * Get user activity timeline
 */
export async function getUserActivity(userId: string, limit = 20) {
  const [
    creditTransactions,
    recentTickets,
    recentAssets,
  ] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.generatedAsset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const activities = [
    ...creditTransactions.map((t: any) => ({
      type: "credit" as const,
      date: t.createdAt,
      description: `${t.type}: ${t.amount} credits`,
      metadata: t,
    })),
    ...recentTickets.map((t: any) => ({
      type: "ticket" as const,
      date: t.createdAt,
      description: `Ticket: ${t.subject}`,
      metadata: t,
    })),
    ...recentAssets.map((a: any) => ({
      type: "asset" as const,
      date: a.createdAt,
      description: `Generated ${a.assetType}`,
      metadata: a,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return activities.slice(0, limit);
}

/**
 * Get paginated tickets with filters
 */
export async function getTickets(params: TicketFilterParams = {}) {
  const {
    status,
    priority,
    assignedTo,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    dateRange = "week",
  } = params;

  const where: Prisma.SupportTicketWhereInput = {};

  if (status) where.status = status as any;
  if (priority) where.priority = priority as any;
  if (assignedTo) where.assignedTo = assignedTo;

  const skip = (page - 1) * limit;
  
  if (dateRange && dateRange !== "all") {
    const { startDate, endDate } = getDateRange(dateRange);
    where.createdAt = { gte: startDate, lte: endDate };
  }

  const [data, count] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 4,
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      skip: skip,
      take: limit,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    tickets: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get ticket with full conversation
 */
export async function getTicketById(ticketId: string) {
  return prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    suspendedUsers,
    totalBusinessCards,
    totalInvoices,
    totalLogos,
    openTickets,
    inProgressTickets,
    resolvedToday,
    totalCreditsDistributed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.businessCard.count(),
    prisma.invoice.count(),
    prisma.logo.count(),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.supportTicket.count({ where: { resolvedAt: { gte: startOfDay } } }),
    prisma.creditTransaction.aggregate({
      where: { type: "CREDIT_ADD" },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    suspendedUsers,
    totalBusinessCards,
    totalInvoices,
    totalLogos,
    openTickets,
    inProgressTickets,
    resolvedToday,
    totalCreditsDistributed: totalCreditsDistributed._sum.amount ?? 0,
  };
}

/**
 * Get ticket metrics for dashboard
 */
export async function getTicketMetrics() {
  const [
    total,
    open,
    inProgress,
    resolved,
    closed,
    highPriority,
    unassigned,
  ] = await Promise.all([
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
    prisma.supportTicket.count({ where: { status: "CLOSED" } }),
    prisma.supportTicket.count({ where: { priority: { in: ["HIGH", "URGENT"] } } }),
    prisma.supportTicket.count({ where: { assignedTo: null } }),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    highPriority,
    unassigned,
  };
}

/**
 * Get analytics overview data
 */
export async function getAnalyticsOverview(days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const [dailyStats, eventsByType, topUsers] = await Promise.all([
    prisma.dailyStats.findMany({
      where: { date: { gte: fromDate } },
      orderBy: { date: "asc" },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: fromDate } },
      _count: { eventType: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: fromDate } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            businessCards: true,
            invoices: true,
            logos: true,
          },
        },
      },
    }),
  ]);

  return {
    dailyStats,
    eventsByType: eventsByType.map((e: any) => ({
      type: e.eventType,
      count: e._count.eventType,
    })),
    topUsers,
  };
}

/**
 * Get system settings
 */
export async function getSystemSettings() {
  return prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
  });
}

/**
 * Get all admin users (for assignment dropdowns)
 */
export async function getAdminUsers() {
  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  const roleIds = [adminRole?.id, superAdminRole?.id].filter(Boolean) as string[];

  if (roleIds.length === 0) return [];

  return prisma.user.findMany({
    where: {
      roles: { some: { roleId: { in: roleIds } } },
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}
