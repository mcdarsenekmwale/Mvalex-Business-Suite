// app/api/admin/audit-logs/users/route.ts
import { auth } from "@/lib/auth";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

// Get user audit logs with filtering and pagination
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const action = searchParams.get("action");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("dateRange");
    const userId = searchParams.get("userId");
    const targetUserId = searchParams.get("targetUserId");
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    let where: any = {};
    
    if (action && action !== "all") {
      where.action = action;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (targetUserId) {
      where.entityId = targetUserId;
    }
    
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { metadata: { path: ["details"], string_contains: search } },
      ];
    }
    
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      
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
      where.createdAt = { gte: startDate };
    }
    
    // Fetch user activities with related user data
    const [events, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: {
          ...where,
          actionType: {
            in: ["CREATE", "UPDATE", "DELETE", "SUSPEND", "ACTIVATE"],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userActivity.count({
        where: {
          ...where,
          actionType: {
            in: ["CREATE", "UPDATE", "DELETE", "SUSPEND", "ACTIVATE"],
          },
        },
      }),
    ]);
    
    // Get additional user details for target users
    const targetUserIds = events
      .map(event => event.entityId)
      .filter((id): id is string => id !== null);
    
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });
    
    const targetUserMap = new Map(targetUsers.map(user => [user.id, user]));
    
    // Format events with user details
    const formattedEvents = events.map(event => ({
      id: event.id,
      action: event.action,
      actionType: event.actionType,
      description: event.description,
      metadata: event.metadata,
      createdAt: event.createdAt,
      performedBy: event.user,
      targetUser: event.entityId ? targetUserMap.get(event.entityId) : null,
      changes: (event.metadata as any)?.changes || [],
    }));
    
    // Calculate stats
    const stats = await calculateUserAuditStats(where);
    
    return NextResponse.json({
      events: formattedEvents,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a user audit log entry
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { action, actionType, entityId, description, metadata } = body;
    
    if (!action || !actionType || !description) {
      return NextResponse.json(
        { error: "Missing required fields: action, actionType, description" },
        { status: 400 }
      );
    }
    
    const activity = await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        action,
        actionType,
        entityType: "USER",
        entityId,
        description,
        metadata: metadata || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    // Log the audit creation
    await ActivityLogger.log({
      userId: session.user.id,
      action: "AUDIT_LOG_CREATED",
      actionType: "CREATE",
      entityType: "AUDIT",
      entityId: activity.id,
      description: `Created user audit log: ${action}`,
    });
    
    return NextResponse.json({
      success: true,
      event: {
        id: activity.id,
        action: activity.action,
        actionType: activity.actionType,
        description: activity.description,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
        performedBy: activity.user,
      },
    });
  } catch (error) {
    console.error("Error creating user audit log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete old audit logs (Super Admin only)
export async function DELETE(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized - Super Admin required" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get("olderThan");
    const keepLast = parseInt(searchParams.get("keepLast") || "10000");
    
    let where: any = {};
    
    if (olderThan) {
      const date = new Date(olderThan);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for olderThan" },
          { status: 400 }
        );
      }
      where.createdAt = { lt: date };
    }
    
    // Get the latest audit logs to keep
    const latestLogs = await prisma.userActivity.findMany({
      where: {
        actionType: { in: ["CREATE", "UPDATE", "DELETE", "SUSPEND", "ACTIVATE"] },
      },
      orderBy: { createdAt: "desc" },
      take: keepLast,
      select: { id: true },
    });
    
    const keepIds = latestLogs.map(log => log.id);
    
    if (keepIds.length > 0) {
      where.id = { not: { in: keepIds } };
    }
    
    const deleted = await prisma.userActivity.deleteMany({ where });
    
    await ActivityLogger.log({
      userId: session.user.id,
      action: "AUDIT_LOGS_CLEANED",
      actionType: "DELETE",
      entityType: "AUDIT",
      description: `Deleted ${deleted.count} old audit logs`,
      metadata: { olderThan, keepLast, deletedCount: deleted.count },
    });
    
    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
      message: `Deleted ${deleted.count} old audit logs`,
    });
  } catch (error) {
    console.error("Error deleting audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate user audit statistics
async function calculateUserAuditStats(where: any) {
  const [
    totalEvents,
    created,
    updated,
    deleted,
    suspended,
    activated,
    roleChanges,
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
  ]);
  
  return {
    totalEvents,
    created,
    updated,
    deleted,
    suspended,
    activated,
    roleChanges,
  };
}