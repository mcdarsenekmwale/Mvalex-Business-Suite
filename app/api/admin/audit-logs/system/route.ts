// app/api/admin/audit/system/route.ts
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

// System event types
const SYSTEM_EVENT_TYPES = [
  "API_CALL",
  "DATABASE_QUERY",
  "CACHE_OPERATION",
  "STORAGE_OPERATION",
  "QUEUE_JOB",
  "WEBHOOK_DELIVERY",
  "SCHEDULED_TASK",
  "BACKUP_CREATED",
  "BACKUP_RESTORED",
  "MIGRATION_RUN",
  "MAINTENANCE_MODE",
  "SYSTEM_UPDATE",
  "SERVICE_RESTART",
  "HEALTH_CHECK",
  "ERROR_THROWN",
  "PERFORMANCE_METRIC",
];

// Component categories
const SYSTEM_COMPONENTS = [
  "database",
  "api",
  "cache",
  "storage",
  "queue",
  "websocket",
  "auth",
  "worker",
  "cron",
  "webhook",
];

// Get system audit logs with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const component = searchParams.get("component");
    const eventType = searchParams.get("eventType");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("dateRange");
    const minDuration = searchParams.get("minDuration");
    const maxDuration = searchParams.get("maxDuration");

    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {
      actionType: "SYSTEM",
    };

    if (status && status !== "all") {
      where.metadata = {
        path: ["status"],
        equals: status,
      };
    }

    if (component && component !== "all") {
      where.metadata = {
        path: ["component"],
        equals: component,
      };
    }

    if (eventType && eventType !== "all") {
      where.action = eventType;
    }

    if (minDuration || maxDuration) {
      where.metadata = {
        path: ["duration"],
      };
      if (minDuration) {
        where.metadata.gte = parseInt(minDuration);
      }
      if (maxDuration) {
        where.metadata.lte = parseInt(maxDuration);
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { metadata: { path: ["component"], string_contains: search } },
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

    // Fetch system events from UserActivity table
    const [events, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userActivity.count({ where }),
    ]);

    // Format events with additional metadata
    const formattedEvents = events.map(event => ({
      id: event.id,
      eventType: event.action,
      status: (event.metadata as any)?.status || determineStatus(event.action),
      component: (event.metadata as any)?.component || determineComponent(event.action),
      description: event.description,
      duration: (event.metadata as any)?.duration,
      metadata: event.metadata,
      userId: event.userId,
      user: event.user,
      createdAt: event.createdAt,
    }));

    // Calculate statistics
    const stats = await calculateSystemStats(where);

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
    console.error("Error fetching system logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch system logs" },
      { status: 500 }
    );
  }
}

// Create a system audit log entry
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, status, component, description, duration, metadata } = body;

    if (!eventType || !description) {
      return NextResponse.json(
        { error: "Missing required fields: eventType, description" },
        { status: 400 }
      );
    }

    if (!SYSTEM_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${SYSTEM_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const activity = await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        action: eventType,
        actionType: "SYSTEM",
        entityType: "SYSTEM",
        description,
        metadata: {
          status: status || "INFO",
          component: component || "api",
          duration: duration || 0,
          ...metadata,
          recordedBy: session.user.id,
          recordedAt: new Date().toISOString(),
        },
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
      action: "SYSTEM_AUDIT_CREATED",
      actionType: "CREATE",
      entityType: "SYSTEM",
      entityId: activity.id,
      description: `Created system audit log: ${eventType}`,
      metadata: { status, component, duration },
    });

    return NextResponse.json({
      success: true,
      event: {
        id: activity.id,
        eventType: activity.action,
        status: (activity.metadata as any)?.status || "INFO",
        component: (activity.metadata as any)?.component || "api",
        description: activity.description,
        duration: (activity.metadata as any)?.duration,
        createdAt: activity.createdAt,
        user: activity.user,
      },
    });
  } catch (error) {
    console.error("Error creating system audit log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete old system audit logs (Super Admin only)
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
    const component = searchParams.get("component");
    const status = searchParams.get("status");

    let where: any = {
      actionType: "SYSTEM",
    };

    if (component && component !== "all") {
      where.metadata = {
        path: ["component"],
        equals: component,
      };
    }

    if (status && status !== "all") {
      where.metadata = {
        path: ["status"],
        equals: status,
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
      where: { actionType: "SYSTEM" },
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
      action: "SYSTEM_AUDIT_CLEANED",
      actionType: "DELETE",
      entityType: "SYSTEM",
      description: `Deleted ${deleted.count} old system audit logs`,
      metadata: { olderThan, keepLast, component, status, deletedCount: deleted.count },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
      message: `Deleted ${deleted.count} old system audit logs`,
    });
  } catch (error) {
    console.error("Error deleting system audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to determine status based on event type
function determineStatus(eventType: string): string {
  const statusMap: Record<string, string> = {
    API_CALL: "SUCCESS",
    DATABASE_QUERY: "SUCCESS",
    CACHE_OPERATION: "SUCCESS",
    STORAGE_OPERATION: "SUCCESS",
    QUEUE_JOB: "SUCCESS",
    WEBHOOK_DELIVERY: "SUCCESS",
    SCHEDULED_TASK: "SUCCESS",
    BACKUP_CREATED: "SUCCESS",
    BACKUP_RESTORED: "SUCCESS",
    MIGRATION_RUN: "SUCCESS",
    MAINTENANCE_MODE: "INFO",
    SYSTEM_UPDATE: "INFO",
    SERVICE_RESTART: "INFO",
    HEALTH_CHECK: "SUCCESS",
    ERROR_THROWN: "FAILURE",
    PERFORMANCE_METRIC: "INFO",
  };
  return statusMap[eventType] || "INFO";
}

// Helper function to determine component based on event type
function determineComponent(eventType: string): string {
  const componentMap: Record<string, string> = {
    API_CALL: "api",
    DATABASE_QUERY: "database",
    CACHE_OPERATION: "cache",
    STORAGE_OPERATION: "storage",
    QUEUE_JOB: "queue",
    WEBHOOK_DELIVERY: "webhook",
    SCHEDULED_TASK: "cron",
    BACKUP_CREATED: "storage",
    BACKUP_RESTORED: "storage",
    MIGRATION_RUN: "database",
    MAINTENANCE_MODE: "system",
    SYSTEM_UPDATE: "system",
    SERVICE_RESTART: "system",
    HEALTH_CHECK: "api",
    ERROR_THROWN: "system",
    PERFORMANCE_METRIC: "system",
  };
  return componentMap[eventType] || "system";
}

// Helper function to calculate system statistics
async function calculateSystemStats(where: any) {
  const [
    totalEvents,
    successEvents,
    failureEvents,
    warningEvents,
    infoEvents,
    avgResponseTime,
    componentStats,
  ] = await Promise.all([
    prisma.userActivity.count({ where }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["status"], equals: "SUCCESS" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["status"], equals: "FAILURE" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["status"], equals: "WARNING" },
      },
    }),
    prisma.userActivity.count({
      where: {
        ...where,
        metadata: { path: ["status"], equals: "INFO" },
      },
    }),
    prisma.userActivity.aggregate({
      where: {
        ...where,
        metadata: { path: ["duration"], not: null },
      },
      _avg: {
        // Using a raw query to average duration from JSON metadata
        // This is a simplified approach - in production, consider a proper schema
      },
    }),
    prisma.userActivity.groupBy({
      by: ["metadata"],
      where,
      _count: true,
    }),
  ]);

  // Calculate average response time from events with duration
  const durationEvents = await prisma.userActivity.findMany({
    where: {
      ...where,
      metadata: { path: ["duration"], not: null },
    },
    select: {
      metadata: true,
    },
    take: 1000,
  });

  let totalDuration = 0;
  let durationCount = 0;
  for (const event of durationEvents) {
    if ((event.metadata as any)?.duration) {
      totalDuration += (event.metadata as any)?.duration;
      durationCount++;
    }
  }
  const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  // Get component distribution
  const componentDistribution = await prisma.userActivity.findMany({
    where,
    select: {
      metadata: true,
    },
  });

  const componentCounts: Record<string, number> = {};
  for (const event of componentDistribution) {
    const comp = (event.metadata as any)?.component || "unknown";
    componentCounts[comp] = (componentCounts[comp] || 0) + 1;
  }

  return {
    totalEvents,
    successEvents,
    failureEvents,
    warningEvents,
    infoEvents,
    avgResponseTime: avgDuration,
    componentDistribution: componentCounts,
  };
}