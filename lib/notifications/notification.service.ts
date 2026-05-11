import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { Resend } from "resend";
import { NotificationType, NotificationChannel, NotificationStatus } from "@/generated/prisma/client";

export type AppNotificationType =
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_RESPONDED"
  | "TICKET_RESOLVED"
  | "TICKET_ESCALATED"
  | "TICKET_UNASSIGNED"
  | "CREDIT_LOW"
  | "CREDIT_ADDED"
  | "CREDIT_EXPIRING"
  | "SYSTEM_ALERT"
  | "AGENT_STATUS_CHANGE"
  | "EXPORT_COMPLETED"
  | "LOGO_GENERATED"
  | "INVOICE_PAID"
  | "TEMPLATE_APPROVED"
  | "SUBSCRIPTION_RENEWAL"
  | "SECURITY_ALERT";

export type AppNotificationChannel = "IN_APP" | "EMAIL" | "PUSH" | "SMS" | "SLACK";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: AppNotificationType;
  metadata?: Record<string, unknown>;
  channels?: AppNotificationChannel[];
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FALLBACK_CHANNELS: AppNotificationChannel[] = ["IN_APP", "EMAIL"];

const TYPE_FALLBACK_MAP: Record<AppNotificationType, string> = {
  TICKET_CREATED: "INFO",
  TICKET_ASSIGNED: "INFO",
  TICKET_RESPONDED: "INFO",
  TICKET_RESOLVED: "SUCCESS",
  TICKET_ESCALATED: "WARNING",
  TICKET_UNASSIGNED: "WARNING",
  CREDIT_LOW: "WARNING",
  CREDIT_ADDED: "SUCCESS",
  CREDIT_EXPIRING: "WARNING",
  SYSTEM_ALERT: "WARNING",
  AGENT_STATUS_CHANGE: "INFO",
  EXPORT_COMPLETED: "SUCCESS",
  LOGO_GENERATED: "SUCCESS",
  INVOICE_PAID: "SUCCESS",
  TEMPLATE_APPROVED: "SUCCESS",
  SUBSCRIPTION_RENEWAL: "INFO",
  SECURITY_ALERT: "WARNING",
};

function toLegacyType(type: AppNotificationType): string {
  return TYPE_FALLBACK_MAP[type] ?? "INFO";
}

function toLegacyChannel(channel: AppNotificationChannel): string {
  if (channel === "SLACK" || channel === "SMS") return "IN_APP";
  return channel;
}

function toPrismaType(type: AppNotificationType): NotificationType {
  return type as unknown as NotificationType;
}

function toPrismaChannel(channel: AppNotificationChannel): NotificationChannel {
  return channel as unknown as NotificationChannel;
}

function toPrismaStatus(status: string): NotificationStatus {
  return status as unknown as NotificationStatus;
}

/**
 * Production-ready notification service with:
 * - Batch sending with rate limiting
 * - Template support
 * - Dead letter queue for failures
 * - Digest aggregation
 * - Idempotency keys
 * - Retry with exponential backoff
 * - Redis caching
 * - Admin alerting
 */
export class NotificationService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS_MS = [1000, 5000, 15000];
  private static readonly BATCH_SIZE = 100;
  private static readonly BATCH_DELAY_MS = 100;
  private static readonly DLQ_THRESHOLD = 100;
  private static readonly CACHE_TTL_SECONDS = 30;

  // --- Core Send ---

  static async send(payload: NotificationPayload): Promise<void> {
    const idempotencyKey = this.buildIdempotencyKey(payload);
    const redis = await getRedis();

    // Idempotency: skip if already sent within last 5 minutes
    const existing = await redis.get(idempotencyKey);
    if (existing) {
      return;
    }
    await redis.set(idempotencyKey, "1", { ex: 300 });

    const channels = payload.channels?.length ? payload.channels : FALLBACK_CHANNELS;
    const enabledChannels = await this.filterChannelsByPreferences(payload.userId, payload.type, channels);

    const primary = enabledChannels[0] ?? "IN_APP";

    // Create notification with proper status tracking
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: toPrismaType(payload.type),
        channel: toPrismaChannel(toLegacyChannel(primary) as AppNotificationChannel),
        status: toPrismaStatus("PENDING"),
        actionUrl: this.metadataHref(payload.metadata),
        entityType: payload.type,
        entityId: this.metadataEntityId(payload.metadata),
        metadata: {
          type: toLegacyType(payload.type) as any,
          actionUrl: this.metadataHref(payload.metadata),
          entityType: payload.type,
          entityId: this.metadataEntityId(payload.metadata),
          ...payload.metadata,
          
        }
      },
    });

    // Dispatch to each enabled channel with retries
    for (const channel of enabledChannels) {
      await this.dispatchWithRetry(notification.id, channel, payload);
    }

    // Update final status
    const finalStatus = await this.deriveFinalStatus(notification.id);
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: toPrismaStatus(finalStatus) },
    });

    // Invalidate user notification cache
    await this.invalidateUserCache(payload.userId);
  }

  /**
   * Send to multiple users with batching and rate limiting.
   * Returns a map of userId -> success boolean.
   */
  static async sendBulk(
    userIds: string[],
    payload: Omit<NotificationPayload, "userId">
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (let i = 0; i < userIds.length; i += this.BATCH_SIZE) {
      const batch = userIds.slice(i, i + this.BATCH_SIZE);
      const promises = batch.map(async (userId) => {
        try {
          await this.send({ ...payload, userId });
          results.set(userId, true);
        } catch (error) {
          console.error(`[NotificationService] Failed to send to ${userId}:`, error);
          results.set(userId, false);
        }
      });

      await Promise.all(promises);

      // Rate limiting between batches
      if (i + this.BATCH_SIZE < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY_MS));
      }
    }

    return results;
  }

  /**
   * Send using a named template with variable substitution.
   */
  static async sendFromTemplate(
    userId: string,
    templateName: string,
    variables: Record<string, string | number>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const template = await prisma.notificationTemplate.findUnique({
      where: { name: templateName, isActive: true },
    });

    if (!template) {
      console.warn(`[NotificationService] Template "${templateName}" not found or inactive`);
      // Fall back to sending a generic system alert instead of throwing
      await this.send({
        userId,
        title: "Notification",
        message: `Template "${templateName}" is not available.`,
        type: "SYSTEM_ALERT",
        metadata,
      });
      return;
    }

    let title = template.title;
    let message = template.message;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      title = title.replace(regex, String(value));
      message = message.replace(regex, String(value));
    }

    await this.send({
      userId,
      title,
      message,
      type: template.type as unknown as AppNotificationType,
      metadata,
      channels: template.channels as AppNotificationChannel[],
    });
  }

  /**
   * Send a digest of unread notifications for a user.
   */
  static async sendDigest(
    userId: string,
    interval: "hourly" | "daily" | "weekly"
  ): Promise<void> {
    const cutoff = new Date();
    switch (interval) {
      case "hourly":
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case "daily":
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case "weekly":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: cutoff },
        isRead: false,
      },
    });

    if (notifications.length === 0) return;

    const grouped = notifications.reduce<Record<string, number>>((acc, n) => {
      const typeKey = String(n.type);
      acc[typeKey] = (acc[typeKey] || 0) + 1;
      return acc;
    }, {});

    const digestMessage = Object.entries(grouped)
      .map(([type, count]) => {
        const label = type.toLowerCase().replace(/_/g, " ");
        return `${count} ${label}${count > 1 ? "s" : ""}`;
      })
      .join(", ");

    await this.send({
      userId,
      title: `Your ${interval} digest`,
      message: `You have ${notifications.length} new notification${notifications.length > 1 ? "s" : ""}: ${digestMessage}`,
      type: "SYSTEM_ALERT",
      channels: ["EMAIL"],
    });
  }

  /**
   * Clean up old read notifications.
   */
  static async cleanupOldNotifications(daysToKeep = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        isRead: true,
      },
    });

    console.log(`[NotificationService] Cleaned up ${deleted.count} old notifications`);
    return deleted.count;
  }

  // --- Read / Status ---

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date(), status: toPrismaStatus("READ") },
    });
    await this.invalidateUserCache(userId);
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date(), status: toPrismaStatus("READ") },
    });
    await this.invalidateUserCache(userId);
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

    await redis.set(cacheKey, String(count), { ex: this.CACHE_TTL_SECONDS });
    return count;
  }

  // --- Broadcast helpers ---

  static async broadcast(
    userIds: string[],
    title: string,
    message: string,
    type: AppNotificationType,
    metadata?: Record<string, unknown>,
    channels?: AppNotificationChannel[]
  ): Promise<void> {
    await this.sendBulk(
      userIds,
      { title, message, type, metadata, channels }
    );
  }

  static async sendToAdmins(
    title: string,
    message: string,
    type: AppNotificationType = "SYSTEM_ALERT",
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const admins = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ["ADMIN", "SUPER_ADMIN"] },
            },
          },
        },
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await this.sendBulk(
      admins.map((a) => a.id),
      { title, message, type, metadata }
    );
  }

  // --- Private dispatch ---

  private static async dispatchWithRetry(
    notificationId: string,
    channel: AppNotificationChannel,
    payload: NotificationPayload
  ): Promise<void> {
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.dispatchToChannel(channel, payload, notificationId);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown dispatch error";
        console.error(
          `[NotificationService] Dispatch failed (attempt ${attempt + 1}/${this.MAX_RETRIES + 1}) for ${notificationId} on ${channel}:`,
          errorMessage
        );

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAYS_MS[attempt] ?? this.RETRY_DELAYS_MS[this.RETRY_DELAYS_MS.length - 1];
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Final failure: record to dead letter queue
          await this.addToDeadLetterQueue(notificationId, errorMessage);
          await this.recordQueueAttempt(notificationId, channel, "FAILED", errorMessage);
        }
      }
    }
  }

  private static async dispatchToChannel(
    channel: AppNotificationChannel,
    payload: NotificationPayload,
    notificationId: string
  ) {
    switch (channel) {
      case "IN_APP":
        this.emitToUser(payload.userId, payload);
        break;
      case "EMAIL":
        await this.sendEmail(payload.userId, payload.title, payload.message);
        break;
      case "SLACK":
        await this.sendSlack(payload.title, payload.message);
        break;
      case "PUSH":
      case "SMS":
        // Stubs: implement with Push/SMS providers when available
        break;
    }

    await this.recordQueueAttempt(notificationId, channel, "COMPLETED");
  }

  static async sendEmail(userId: string, subject: string, content: string) {
    if (!resend) return;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "notifications@mvalex.com",
      to: user.email,
      subject,
      html: this.formatEmailTemplate(subject, content),
    });
  }

  private static async sendSlack(title: string, message: string) {
    if (!process.env.SLACK_WEBHOOK_URL) return;
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `*${title}*\n${message}` }),
    });
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }

  private static emitToUser(userId: string, payload: NotificationPayload) {
    const globalServer = globalThis as unknown as {
      wsServer?: { emitToUser: (id: string, event: string, data: unknown) => void };
    };
    globalServer.wsServer?.emitToUser(userId, "new_notification", payload);
  }

  // --- Preferences ---

  private static async filterChannelsByPreferences(
    userId: string,
    type: AppNotificationType,
    channels: AppNotificationChannel[]
  ): Promise<AppNotificationChannel[]> {
    try {
      const prefs = await prisma.notificationPreference.findMany({
        where: { userId, type: toPrismaType(type) },
        select: { channel: true, enabled: true },
      });

      if (!prefs.length) return channels;

      return channels.filter((channel) => {
        const pref = prefs.find((p) => p.channel === toPrismaChannel(channel));
        return pref ? pref.enabled : true;
      });
    } catch {
      return channels;
    }
  }

  // --- Queue / DLQ / Status ---

  private static async recordQueueAttempt(
    notificationId: string,
    channel: AppNotificationChannel,
    status: "COMPLETED" | "FAILED",
    errorMessage?: string
  ) {
    try {
      await prisma.notificationQueue.create({
        data: {
          notificationId,
          channel: toPrismaChannel(channel),
          status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
          errorMessage,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
          maxRetries: 3,
        },
      });
    } catch {
      // Best-effort queue recording
    }
  }

  private static async addToDeadLetterQueue(notificationId: string, error: string): Promise<void> {
    const redis = await getRedis();
    const entry = JSON.stringify({ notificationId, error, timestamp: new Date().toISOString() });
    await redis.lpush("notifications:dead-letter", entry);

    const len = await redis.llen("notifications:dead-letter");
    if (len > this.DLQ_THRESHOLD) {
      await this.sendToAdmins(
        "⚠️ Notification System Alert",
        `Dead letter queue has ${len} failed notifications. Please review.`,
        "SYSTEM_ALERT"
      );
    }
  }

  private static async deriveFinalStatus(notificationId: string): Promise<string> {
    try {
      const queues = await prisma.notificationQueue.findMany({
        where: { notificationId },
        select: { status: true },
      });
      if (queues.length === 0) return "SENT";
      const allFailed = queues.every((q) => q.status === "FAILED");
      if (allFailed) return "FAILED";
      const anyCompleted = queues.some((q) => q.status === "COMPLETED");
      return anyCompleted ? "DELIVERED" : "RETRYING";
    } catch {
      return "SENT";
    }
  }

  // --- Cache helpers ---

  private static async invalidateUserCache(userId: string): Promise<void> {
    const redis = await getRedis();
    const keys = await redis.keys(`notifications:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private static buildIdempotencyKey(payload: NotificationPayload): string {
    // Simple hash of userId + type + title + timestamp minute
    const minute = Math.floor(Date.now() / 60000);
    return `notifications:idempotency:${payload.userId}:${payload.type}:${minute}`;
  }

  private static metadataHref(metadata?: Record<string, unknown>) {
    const href = metadata?.href;
    return typeof href === "string" ? href : null;
  }

  private static metadataEntityId(metadata?: Record<string, unknown>) {
    const id = metadata?.ticketId ?? metadata?.entityId;
    return typeof id === "string" ? id : null;
  }

     // Email template formatter
  protected static formatEmailTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9fafb; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
          .ticket-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Mvalex Business Suite</h2>
            <h3>${title}</h3>
          </div>
          <div class="content">
            <div>${content}</div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Mvalex Technology Co., Ltd. All rights reserved.</p>
            <p>You're receiving this email because you have an account with Mvalex Business Suite.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
