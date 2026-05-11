import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/notification.service";
import { getRedis } from "@/lib/redis";

export class CreditEventListeners {
  static async checkLowCredit(userId: string, currentBalance: number): Promise<void> {
    const thresholds = [100, 50, 25, 10, 5];
    for (const threshold of thresholds) {
      if (currentBalance <= threshold && !(await this.hasNotified(userId, threshold))) {
        await NotificationService.send({
          userId,
          title: "Low Credit Balance",
          message: `Your remaining balance is ${currentBalance}. Please top up to avoid interruptions.`,
          type: "CREDIT_LOW",
          channels: ["IN_APP", "EMAIL"],
          metadata: { balance: currentBalance, threshold, href: "/credits/purchase" },
        });
        await this.markNotified(userId, threshold);
        break;
      }
    }
  }

  static async onCreditAdded(userId: string, amount: number, newBalance: number, reason?: string): Promise<void> {
    await NotificationService.send({
      userId,
      title: "Credits Added",
      message: `${amount} credits were added. New balance: ${newBalance}.${reason ? ` Reason: ${reason}` : ""}`,
      type: "CREDIT_ADDED",
      metadata: { amount, newBalance, reason, href: "/history" },
    });
  }

  static async notifyExpiringCredits(days = 7): Promise<number> {
    const recentAdds = await prisma.creditTransaction.findMany({
      where: {
        type: "CREDIT_ADD",
        createdAt: {
          lte: new Date(Date.now() - (30 - days) * 24 * 60 * 60 * 1000),
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 500,
    });

    await Promise.all(
      recentAdds.map((row) =>
        NotificationService.send({
          userId: row.userId,
          title: "Credit Expiry Reminder",
          message: `Some of your credits may expire in about ${days} days.`,
          type: "CREDIT_EXPIRING",
          metadata: { href: "/history" },
        })
      )
    );

    return recentAdds.length;
  }

  private static async hasNotified(userId: string, threshold: number): Promise<boolean> {
    const redis = await getRedis();
    const key = `credit:notified:${userId}:${threshold}`;
    const hit = await redis.get(key);
    return Boolean(hit);
  }

  private static async markNotified(userId: string, threshold: number): Promise<void> {
    const redis = await getRedis();
    const key = `credit:notified:${userId}:${threshold}`;
    await redis.set(key, "1", { ex: 60 * 60 * 24 * 7 });
  }
}
