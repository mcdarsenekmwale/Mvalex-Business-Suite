import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/permissions";
import { NotificationService } from "@/lib/notifications/notification.service";
import { NotificationCache } from "@/lib/cache/notification-cache";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().min(1),
  channel: z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "SLACK"]).optional(),
  target: z.enum(["all", "admins", "specific"]).optional(),
  userId: z.string().optional(),
  actionUrl: z.string().optional(),
});

// GET: Fetch paginated notifications for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const unreadOnly = searchParams.get("unread") === "true";
    const type = searchParams.get("type") || undefined;

    const result = await NotificationCache.getUserNotifications(
      session.user.id,
      page,
      limit,
      unreadOnly,
      type
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Admin-only — create & broadcast a notification
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, message, type, channel = "IN_APP", target = "all", userId, actionUrl } = parsed.data;

    let targetUserIds: string[] = [];

    if (target === "all") {
      const users = await prisma.user.findMany({ select: { id: true } });
      targetUserIds = users.map((u) => u.id);
    } else if (target === "admins") {
      const adminUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                type: { in: ["ADMIN", "SUPER_ADMIN"] },
              },
            },
          },
        },
        select: { id: true },
      });
      targetUserIds = adminUsers.map((u) => u.id);
    } else if (target === "specific" && userId) {
      targetUserIds = [userId];
    } else {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const normalizedType =
      typeof type === "string" && type.toUpperCase() === "INFO"
        ? "SYSTEM_ALERT"
        : typeof type === "string" && type.toUpperCase() === "SUCCESS"
          ? "EXPORT_COMPLETED"
          : typeof type === "string" && type.toUpperCase() === "WARNING"
            ? "SYSTEM_ALERT"
            : typeof type === "string" && type.toUpperCase() === "ERROR"
              ? "SYSTEM_ALERT"
              : (type as any);

    const results = await NotificationService.sendBulk(
      targetUserIds,
      {
        title,
        message,
        type: normalizedType,
        metadata: actionUrl ? { href: actionUrl } : undefined,
        channels: [channel as any],
      }
    );

    const successCount = Array.from(results.values()).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      sentCount: successCount,
      failedCount: targetUserIds.length - successCount,
      batches: Math.ceil(targetUserIds.length / 100),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Bulk mark-as-read for the current user
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      await NotificationService.markAllAsRead(session.user.id);
    } else {
      await Promise.all(ids.map((id) => NotificationService.markAsRead(id, session.user.id)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Bulk delete notifications for the current user
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationIds, deleteAllRead, olderThan } = body as {
      notificationIds?: string[];
      deleteAllRead?: boolean;
      olderThan?: string;
    };

    const where: any = { userId: session.user.id };

    if (notificationIds && notificationIds.length > 0) {
      where.id = { in: notificationIds };
    }

    if (deleteAllRead) {
      where.isRead = true;
    }

    if (olderThan) {
      where.createdAt = { lt: new Date(olderThan) };
    }

    const result = await prisma.notification.deleteMany({ where });
    await NotificationCache.invalidateUserCache(session.user.id);

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
