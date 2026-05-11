import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

const DEFAULT_PAGE_SIZE = 20;
const CACHE_TTL_SECONDS = 30;

export interface PaginatedNotifications {
  notifications: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

/**
 * Redis-backed notification cache with automatic invalidation.
 */
export class NotificationCache {

  static async getUserNotifications(
    userId: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    unreadOnly = false,
    type?: string
  ): Promise<PaginatedNotifications> {
    const redis = await getRedis();
    const cacheKey = `notifications:${userId}:page:${page}:limit:${limit}:unread:${unreadOnly}:type:${type || "all"}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached as string);
      } catch {
        // fall through to DB
      }
    }

    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const result: PaginatedNotifications = {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
      unreadCount,
    };

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
    return result;
  }

  static async invalidateUserCache(userId: string): Promise<void> {
    const redis = await getRedis();
    const keys = await redis.keys(`notifications:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const redis = await getRedis();
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return Number(cached);
    }
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    await redis.set(cacheKey, String(count), { ex: CACHE_TTL_SECONDS });
    return count;
  }

  static async setUnreadCount(userId: string, count: number): Promise<void> {
    const redis = await getRedis();
    await redis.set(`notifications:unread:${userId}`, String(count), { ex: CACHE_TTL_SECONDS });
  }
}
