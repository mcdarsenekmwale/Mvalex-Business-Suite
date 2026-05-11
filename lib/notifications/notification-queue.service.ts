import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/notification.service";

type QueueRow = {
  id: string;
  notificationId: string;
  channel: "IN_APP" | "EMAIL" | "PUSH" | "SMS" | "SLACK";
  retryCount: number;
  maxRetries: number;
};

export class NotificationQueueService {
  static async processDue(limit = 50): Promise<number> {
    const due = await prisma.$queryRaw<QueueRow[]>`
      SELECT "id", "notificationId", "channel", "retryCount", "maxRetries"
      FROM "NotificationQueue"
      WHERE "status" IN ('PENDING', 'FAILED')
        AND "nextRetryAt" <= NOW()
      ORDER BY "nextRetryAt" ASC
      LIMIT ${limit}
    `;

    let processed = 0;
    for (const item of due) {
      const notification = await prisma.notification.findUnique({ where: { id: item.notificationId } });
      if (!notification) continue;

      try {
        await NotificationService.send({
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: (notification.entityType || "SYSTEM_ALERT") as any,
          channels: [item.channel],
          metadata: notification.actionUrl ? { href: notification.actionUrl } : undefined,
        });

        await prisma.$executeRaw`
          UPDATE "NotificationQueue"
          SET "status" = 'COMPLETED', "updatedAt" = NOW()
          WHERE "id" = ${item.id}
        `;
      } catch (error) {
        const retries = item.retryCount + 1;
        const failed = retries >= item.maxRetries;
        await prisma.$executeRaw`
          UPDATE "NotificationQueue"
          SET "retryCount" = ${retries},
              "status" = ${failed ? "FAILED" : "PENDING"}::"QueueStatus",
              "errorMessage" = ${(error as Error).message ?? "Retry failed"},
              "nextRetryAt" = NOW() + INTERVAL '5 minutes',
              "updatedAt" = NOW()
          WHERE "id" = ${item.id}
        `;
      }

      processed += 1;
    }

    return processed;
  }
}
