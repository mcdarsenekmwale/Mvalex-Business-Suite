import { getRedis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export interface SessionMetadata {
  sessionToken: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  browser: string;
  os: string;
  lastActivityAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
}

export class SessionStore {
  private static readonly SESSION_PREFIX = "session:";
  private static readonly USER_SESSIONS_PREFIX = "user:sessions:";
  private static readonly SESSION_TTL = 30 * 24 * 60 * 60; // 30 days

  static async storeSessionMetadata(
    sessionToken: string,
    userId: string,
    metadata: Omit<SessionMetadata, "sessionToken" | "userId">
  ): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionToken}`;
    const userKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    const sessionData: SessionMetadata = {
      sessionToken,
      userId,
      ...metadata,
    };

    try {
      const redis = await getRedis();
      await redis.set(key, JSON.stringify(sessionData), { ex: this.SESSION_TTL });
      await redis.sadd(userKey, sessionToken);
      await redis.set(userKey, "", { ex: this.SESSION_TTL });
    } catch {
      // ignore Redis errors
    }
  }

  static async getSessionMetadata(
    sessionToken: string
  ): Promise<SessionMetadata | null> {
    try {
      const redis = await getRedis();
      const data = await redis.get(`${this.SESSION_PREFIX}${sessionToken}`);
      return data ? (JSON.parse(data) as SessionMetadata) : null;
    } catch {
      return null;
    }
  }

  static async getUserSessions(userId: string): Promise<SessionMetadata[]> {
    try {
      const redis = await getRedis();
      const userKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionTokens = await redis.smembers(userKey);

      const sessions = await Promise.all(
        sessionTokens.map((token) => this.getSessionMetadata(token))
      );

      // Filter out expired or missing sessions
      const validSessions: SessionMetadata[] = [];
      for (const s of sessions) {
        if (!s) continue;
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: s.sessionToken },
        });
        if (dbSession && dbSession.expires > new Date()) {
          s.status = "active";
          validSessions.push(s);
        } else if (dbSession) {
          s.status = "expired";
        } else {
          s.status = "revoked";
        }
      }
      return validSessions;
    } catch {
      return [];
    }
  }

  static async revokeSession(
    sessionToken: string,
    userId: string
  ): Promise<boolean> {
    try {
      const redis = await getRedis();
      const key = `${this.SESSION_PREFIX}${sessionToken}`;
      const userKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

      await redis.del(key);
      await redis.srem(userKey, sessionToken);

      const result = await prisma.session.deleteMany({
        where: {
          sessionToken,
          userId,
        },
      });

      return result.count > 0;
    } catch {
      return false;
    }
  }

  static async revokeOtherSessions(
    userId: string,
    currentSessionToken: string
  ): Promise<number> {
    try {
      const userSessions = await this.getUserSessions(userId);
      let revokedCount = 0;

      for (const session of userSessions) {
        if (session.sessionToken !== currentSessionToken) {
          const revoked = await this.revokeSession(
            session.sessionToken,
            userId
          );
          if (revoked) revokedCount++;
        }
      }

      return revokedCount;
    } catch {
      return 0;
    }
  }

  static async updateLastActivity(
    sessionToken: string,
    userId: string
  ): Promise<void> {
    try {
      const metadata = await this.getSessionMetadata(sessionToken);
      if (metadata) {
        metadata.lastActivityAt = new Date().toISOString();
        await this.storeSessionMetadata(sessionToken, userId, metadata);
      }
    } catch {
      // ignore
    }
  }

  // Admin helpers
  static async getAllActiveSessions(
    limit = 50,
    offset = 0
  ): Promise<
    Array<SessionMetadata & { user: { id: string; name: string | null; email: string } }>
  > {
    const dbSessions = await prisma.session.findMany({
      where: { expires: { gt: new Date() } },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { expires: "desc" },
      take: limit,
      skip: offset,
    });

    const results = await Promise.all(
      dbSessions.map(async (dbSession) => {
        const meta = await this.getSessionMetadata(dbSession.sessionToken);
        return {
          sessionToken: dbSession.sessionToken,
          userId: dbSession.userId,
          userAgent: meta?.userAgent || "Unknown",
          ipAddress: meta?.ipAddress || "Unknown",
          deviceType: meta?.deviceType || "unknown",
          browser: meta?.browser || "Unknown",
          os: meta?.os || "Unknown",
          lastActivityAt: meta?.lastActivityAt || dbSession.expires.toISOString(),
          expiresAt: dbSession.expires.toISOString(),
          status: (meta?.status || "active") as "active" | "expired" | "revoked",
          user: dbSession.user,
        };
      })
    );

    return results;
  }

  static async getDeviceStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    try {
      const redis = await getRedis();
      const keys = await redis.keys(`${this.SESSION_PREFIX}*`);
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const meta = JSON.parse(data) as SessionMetadata;
          stats[meta.deviceType] = (stats[meta.deviceType] || 0) + 1;
        }
      }
    } catch {
      // ignore
    }
    return stats;
  }

  static async getBrowserStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    try {
      const redis = await getRedis();
      const keys = await redis.keys(`${this.SESSION_PREFIX}*`);
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const meta = JSON.parse(data) as SessionMetadata;
          stats[meta.browser] = (stats[meta.browser] || 0) + 1;
        }
      }
    } catch {
      // ignore
    }
    return stats;
  }

  static async getAverageSessionDuration(): Promise<number> {
    try {
      const sessions = await prisma.session.findMany({
        where: { expires: { gt: new Date() } },
        select: { expires: true },
      });
      if (sessions.length === 0) return 0;
      const totalMs = sessions.reduce(
        (sum, s) => sum + (s.expires.getTime() - Date.now()),
        0
      );
      return Math.round(totalMs / sessions.length / (1000 * 60 * 60)); // hours
    } catch {
      return 0;
    }
  }
}
