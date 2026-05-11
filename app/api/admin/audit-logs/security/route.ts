// app/api/admin/audit/security/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
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

// Security event types
const SECURITY_EVENT_TYPES = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "USER_CREATED",
  "USER_DELETED",
  "USER_SUSPENDED",
  "USER_ACTIVATED",
  "ROLE_CHANGED",
  "PERMISSION_CHANGED",
  "PASSWORD_CHANGED",
  "MFA_ENABLED",
  "MFA_DISABLED",
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "SESSION_REVOKED",
  "IP_BLOCKED",
  "IP_WHITELISTED",
  "RATE_LIMIT_EXCEEDED",
];

// Get security audit logs with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const severity = searchParams.get("severity");
    const eventType = searchParams.get("eventType");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("dateRange");
    const userId = searchParams.get("userId");
    const ipAddress = searchParams.get("ipAddress");

    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {
      actionType: "SECURITY",
    };

    if (severity && severity !== "all") {
      where.metadata = {
        path: ["severity"],
        equals: severity,
      };
    }

    if (eventType && eventType !== "all") {
      where.action = eventType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (ipAddress) {
      where.metadata = {
        path: ["ipAddress"],
        equals: ipAddress,
      };
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
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

    // Fetch security events from UserActivity table
    const [events, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
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
      prisma.userActivity.count({ where }),
    ]);

    // Format events with severity and additional metadata
    const formattedEvents = events.map(event => ({
      id: event.id,
      eventType: event.action,
      severity: (event.metadata as any)?.severity || determineSeverity(event.action),
      description: event.description,
      userId: event.userId,
      user: event.user,
      ipAddress: (event.metadata as any)?.ipAddress || event.ipAddress,
      userAgent: (event.metadata as any)?.userAgent || event.userAgent,
      metadata: event.metadata,
      createdAt: event.createdAt,
    }));

    // Calculate statistics
    const stats = await calculateSecurityStats(where);

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
    console.error("Error fetching security logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch security logs" },
      { status: 500 }
    );
  }
}

// Create a security audit log entry
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, severity, description, userId, metadata } = body;

    if (!eventType || !description) {
      return NextResponse.json(
        { error: "Missing required fields: eventType, description" },
        { status: 400 }
      );
    }

    if (!SECURITY_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${SECURITY_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const activity = await prisma.userActivity.create({
      data: {
        userId: userId || session.user.id,
        action: eventType,
        actionType: "SECURITY",
        entityType: "SECURITY",
        description,
        metadata: {
          severity: severity || "MEDIUM",
          ...metadata,
          recordedBy: session.user.id,
          recordedAt: new Date().toISOString(),
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the audit creation
    await ActivityLogger.log({
      userId: session.user.id,
      action: "SECURITY_AUDIT_CREATED",
      actionType: "CREATE",
      entityType: "SECURITY",
      entityId: activity.id,
      description: `Created security audit log: ${eventType}`,
      metadata: { severity, targetUserId: userId },
    });

    return NextResponse.json({
      success: true,
      event: {
        id: activity.id,
        eventType: activity.action,
        severity: (activity.metadata as any)?.severity || "MEDIUM",
        description: activity.description,
        createdAt: activity.createdAt,
        user: activity.user,
      },
    });
  } catch (error) {
    console.error("Error creating security audit log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete old security audit logs (Super Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Super Admin required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get("olderThan");
    const keepLast = parseInt(searchParams.get("keepLast") || "10000");
    const severity = searchParams.get("severity");

    let where: any = {
      actionType: "SECURITY",
    };

    if (severity && severity !== "all") {
      where.metadata = {
        path: ["severity"],
        equals: severity,
      };
    }

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

    // Get the latest logs to keep
    const latestLogs = await prisma.userActivity.findMany({
      where: { actionType: "SECURITY" },
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
      action: "SECURITY_AUDIT_CLEANED",
      actionType: "DELETE",
      entityType: "SECURITY",
      description: `Deleted ${deleted.count} old security audit logs`,
      metadata: { olderThan, keepLast, severity, deletedCount: deleted.count },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
      message: `Deleted ${deleted.count} old security audit logs`,
    });
  } catch (error) {
    console.error("Error deleting security audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to determine severity based on event type
function determineSeverity(eventType: string): string {
  const severityMap: Record<string, string> = {
    LOGIN_FAILURE: "MEDIUM",
    LOGIN_SUCCESS: "LOW",
    LOGOUT: "LOW",
    USER_CREATED: "LOW",
    USER_DELETED: "HIGH",
    USER_SUSPENDED: "HIGH",
    USER_ACTIVATED: "MEDIUM",
    ROLE_CHANGED: "HIGH",
    PERMISSION_CHANGED: "HIGH",
    PASSWORD_CHANGED: "MEDIUM",
    MFA_ENABLED: "LOW",
    MFA_DISABLED: "HIGH",
    API_KEY_CREATED: "MEDIUM",
    API_KEY_REVOKED: "MEDIUM",
    SESSION_REVOKED: "MEDIUM",
    IP_BLOCKED: "HIGH",
    RATE_LIMIT_EXCEEDED: "LOW",
  };
  return severityMap[eventType] || "MEDIUM";
}

// Helper function to calculate security statistics
async function calculateSecurityStats(where: any) {
  const [
    totalEvents,
    criticalEvents,
    highEvents,
    mediumEvents,
    lowEvents,
    failedLogins,
    successfulLogins,
    roleChanges,
    permissionChanges,
  ] = await Promise.all([
    prisma.userActivity.count({ where }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["severity"], equals: "CRITICAL" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["severity"], equals: "HIGH" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["severity"], equals: "MEDIUM" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["severity"], equals: "LOW" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        action: "LOGIN_FAILURE",
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        action: "LOGIN_SUCCESS",
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        action: "ROLE_CHANGED",
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        action: "PERMISSION_CHANGED",
      },
    }),
  ]);

  // Get unique users and IPs
  const uniqueUsersResult = await prisma.userActivity.groupBy({
    by: ["userId"],
    where,
    _count: true,
  });

  const uniqueIPsResult = await prisma.userActivity.groupBy({
    by: ["ipAddress"],
    where: { ...where, ipAddress: { not: null } },
    _count: true,
  });

  return {
    totalEvents,
    criticalEvents,
    highEvents,
    mediumEvents,
    lowEvents,
    failedLogins,
    successfulLogins,
    roleChanges,
    permissionChanges,
    uniqueUsers: uniqueUsersResult.length,
    uniqueIPs: uniqueIPsResult.length,
  };
}