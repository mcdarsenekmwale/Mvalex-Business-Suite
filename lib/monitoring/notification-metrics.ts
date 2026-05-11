import { getRedis } from "@/lib/redis";
import { NotificationService } from "@/lib/notifications/notification.service";
import { prisma } from "@/lib/prisma";

/**
 * Notification delivery metrics and alerting.
 */
export class NotificationMetrics {
  private static readonly FAILURE_THRESHOLD = 0.1; // 10%
  private static readonly METRIC_WINDOW_SECONDS = 300; // 5 minutes

  static async recordDelivery(
    notificationId: string,
    channel: string,
    success: boolean,
    latencyMs: number
  ): Promise<void> {
    const redis = await getRedis();
    const metric = {
      notificationId,
      channel,
      success,
      timestamp: new Date().toISOString(),
      latency: latencyMs,
    };

    await redis.lpush("metrics:notifications", JSON.stringify(metric));
    await redis.ltrim("metrics:notifications", 0, 9999); // Keep last 10k

    if (!success) {
      await redis.zincrby("metrics:notifications:failures", 1, channel);
    }

    // Alert on high failure rate
    const failureRate = await this.getFailureRate(this.METRIC_WINDOW_SECONDS);
    if (failureRate > this.FAILURE_THRESHOLD) {
      await NotificationService.sendToAdmins(
        "🚨 High Notification Failure Rate",
        `Notification failure rate is ${(failureRate * 100).toFixed(1)}% in the last 5 minutes.`,
        "SYSTEM_ALERT"
      );
    }
  }

  static async getFailureRate(windowSeconds: number): Promise<number> {
    const redis = await getRedis();
    const cutoff = Date.now() - windowSeconds * 1000;
    const metrics = await redis.lrange("metrics:notifications", 0, 4999);

    let total = 0;
    let failures = 0;

    for (const raw of metrics) {
      try {
        const m = JSON.parse(raw as string);
        if (new Date(m.timestamp).getTime() >= cutoff) {
          total++;
          if (!m.success) failures++;
        }
      } catch {
        // skip malformed
      }
    }

    return total > 0 ? failures / total : 0;
  }

  static async getDeliveryStats(hours = 24): Promise<any> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await prisma.notification.groupBy({
      by: ["status", "type"],
      where: { createdAt: { gte: cutoff } },
      _count: true,
    });

    return stats;
  }

  static async getRecentMetrics(limit = 100): Promise<any[]> {
    const redis = await getRedis();
    const raw = await redis.lrange("metrics:notifications", 0, limit - 1);
    return raw.map((r: string) => {
      try {
        return JSON.parse(r);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
}
