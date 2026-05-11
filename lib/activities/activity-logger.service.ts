import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface ActivityLogData {
  userId: string;
  action: string;
  actionType: "CREATE" | "EDIT" | "DELETE" | "EXPORT" | "VIEW" | "LOGIN" | "LOGOUT" | "PURCHASE" | "REFUND" | "ASSIGN" | "REVOKE" | "UPDATE";
  entityType: string;
  entityId?: string;
  creditsUsed?: number;
  creditsBefore?: number;
  creditsAfter?: number;
  description?: string;
  metadata?: Record<string, any>;
}

export class ActivityLogger {
  /**
   * Log a user activity asynchronously (non-blocking).
   * Uses .catch() to ensure it never throws or blocks the main flow.
   */
  static log(data: ActivityLogData): void {
    // Fire-and-forget: do not await
    this.logAsync(data).catch((error) => {
      console.error("[ActivityLogger] Failed to log activity:", error);
    });
  }

  /**
   * Internal async implementation. Call via `log()` for non-blocking behavior.
   */
  private static async logAsync(data: ActivityLogData): Promise<void> {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    try {
      const headersList = await headers();
      ipAddress =
        headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        undefined;
      userAgent = headersList.get("user-agent") || undefined;
    } catch {
      // Not in API route context (e.g. server component or background job)
    }

    await prisma.userActivity.create({
      data: {
        userId: data.userId,
        action: data.action,
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        creditsUsed: data.creditsUsed || 0,
        creditsBefore: data.creditsBefore,
        creditsAfter: data.creditsAfter,
        description: data.description || this.generateDescription(data),
        metadata: data.metadata ?? {},
        ipAddress,
        userAgent,
      },
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[ACTIVITY] ${data.userId} - ${data.action} - ${data.entityType}`);
    }
  }

  /**
   * Convenience helper for logging credit-linked activities.
   * Non-blocking.
   */
  static logWithCredits(
    userId: string,
    action: string,
    actionType: ActivityLogData["actionType"],
    entityType: string,
    entityId: string | undefined,
    creditsUsed: number,
    creditsBefore: number,
    creditsAfter: number,
    metadata?: Record<string, any>
  ): void {
    this.log({
      userId,
      action,
      actionType,
      entityType,
      entityId,
      creditsUsed,
      creditsBefore,
      creditsAfter,
      metadata,
    });
  }

  /**
   * Log a failed operation. Non-blocking.
   */
  static logFailure(
    userId: string,
    action: string,
    actionType: ActivityLogData["actionType"],
    entityType: string,
    errorMessage: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      userId,
      action: `${action}_FAILED`,
      actionType,
      entityType,
      description: `Failed: ${errorMessage}`,
      metadata: { ...metadata, error: errorMessage },
    });
  }

  private static generateDescription(data: ActivityLogData): string {
    const actionMap: Record<string, string> = {
      CREATE: `Created ${this.formatEntity(data.entityType)}`,
      EDIT: `Edited ${this.formatEntity(data.entityType)}`,
      DELETE: `Deleted ${this.formatEntity(data.entityType)}`,
      EXPORT: `Exported ${this.formatEntity(data.entityType)}`,
      VIEW: `Viewed ${this.formatEntity(data.entityType)}`,
      LOGIN: "Logged in",
      LOGOUT: "Logged out",
      PURCHASE: `Purchased ${this.formatEntity(data.entityType)}`,
      REFUND: `Refunded ${this.formatEntity(data.entityType)}`,
    };

    let description = actionMap[data.actionType] || data.action;

    if (data.creditsUsed && data.creditsUsed > 0) {
      description += ` (-${data.creditsUsed} credits)`;
    }

    if (data.metadata?.details) {
      description += ` — ${data.metadata.details}`;
    }

    return description;
  }

  private static formatEntity(entityType: string): string {
    return entityType
      .toLowerCase()
      .replace(/_/g, " ");
  }
}
