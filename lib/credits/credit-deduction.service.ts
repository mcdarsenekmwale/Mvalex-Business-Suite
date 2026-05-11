import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { setCachedBalance, invalidateBalanceCache } from "@/lib/redis";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

export interface CreditDeductionRequest {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface CreditDeductionResponse {
  success: boolean;
  creditsDeducted: number;
  balanceBefore: number;
  balanceAfter: number;
  transactionId: string;
  refunded?: boolean;
}

export class CreditDeductionService {
  async deductCredits(request: CreditDeductionRequest): Promise<CreditDeductionResponse> {
    const { userId, action, entityType, entityId, metadata, idempotencyKey } = request;

    // Idempotency: if key provided and already consumed, return stored response
    if (idempotencyKey) {
      const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
      if (existingKey && existingKey.consumed && existingKey.responseData) {
        return existingKey.responseData as unknown as CreditDeductionResponse;
      }
      // create a placeholder key
      if (!existingKey) {
        await prisma.idempotencyKey.create({ data: { key: idempotencyKey, userId } });
      }
    }

    // Use a transaction with explicit row lock via a SELECT ... FOR UPDATE
    // Timeout increased to 30s to accommodate high-latency remote DB connections
    const result = await prisma.$transaction(async (tx) => {
      // Lock user row
      const lockedUsers = await tx.$queryRaw(Prisma.sql`SELECT id, credits_balance FROM users WHERE id = ${userId} FOR UPDATE`) as Array<{ id: string; credits_balance: number }>;

      const userRow = lockedUsers[0];
      if (!userRow) throw new Error("User not found");

      const balanceBefore = Number(userRow.credits_balance ?? 0);

      // Determine cost
      const cost = await this.getCostForAction(userId, action, metadata);

      if (cost > balanceBefore) {
        throw new Error("Insufficient credits");
      }

      const balanceAfter = balanceBefore - cost;

      // Create transaction record
      const txRecord = await tx.creditTransaction.create({
        data: {
          userId,
          amount: -cost,
          type: "CREDIT_DEDUCT",
          action: action as any,
          entityType,
          entityId,
          description: `Deduct for ${action}`,
          metadata: metadata ?? {},
          balanceAfter,
        },
      });

      // Update user balance
      await tx.user.update({ 
        where: { id: userId }, 
        data: { creditsBalance: balanceAfter } 
      });

      // Audit log
      await tx.creditAuditLog.create({
        data: {
          userId,
          action,
          amount: -cost,
          balanceBefore,
          balanceAfter,
          metadata: metadata ?? {},
        },
      });

      // Low credit notification
      if (balanceAfter < 20) {
        try {
          await tx.notification.create({
            data: {
              userId,
              type: "CREDIT_LOW",
              title: "Low Credit Balance",
              message: `Your credit balance is now ${balanceAfter}. Purchase more credits to continue creating assets.`,
              channel: "IN_APP",
              actionUrl: "/settings",
              actionText: "Buy Credits",
            },
          });
        } catch (notifErr) {
          console.error("Failed to create low credit notification:", notifErr);
        }
      }

      // Mark idempotency key consumed and store response
      if (idempotencyKey) {
        await tx.idempotencyKey.update({
          where: { key: idempotencyKey },
          data: {
            consumed: true,
            responseData: {
              success: true,
              creditsDeducted: cost,
              balanceBefore,
              balanceAfter,
              transactionId: txRecord.id,
            },
          },
        });
      }

      return {
        success: true,
        creditsDeducted: cost,
        balanceBefore,
        balanceAfter,
        transactionId: txRecord.id,
      } as CreditDeductionResponse;
    }, { timeout: 30000 });

    // Cache new balance
    await setCachedBalance(userId, result.balanceAfter);

    // Log activity asynchronously (non-blocking, outside transaction)
    ActivityLogger.logWithCredits(
      userId,
      action,
      "CREATE",
      entityType || "UNKNOWN",
      entityId,
      result.creditsDeducted,
      result.balanceBefore,
      result.balanceAfter,
      metadata
    );

    return result;
  }

  async refundCredits(transactionId: string, reason: string): Promise<boolean> {
    // Find original transaction
    const original = await prisma.creditTransaction.findUnique({ where: { id: transactionId } });
    if (!original) throw new Error("Original transaction not found");

    // Prevent double refunds: look for refund referencing this transaction
    const existingRefund = await prisma.creditTransaction.findFirst({ where: { metadata: { path: ["originalTransactionId"], equals: original.id }, type: "CREDIT_REFUND" as any } });
    if (existingRefund) return false;

    // Perform refund in transaction
    let refundBalanceBefore = 0;
    let refundBalanceAfter = 0;
    let refundAmount = 0;

    await prisma.$transaction(async (tx) => {
      const user = await tx.$queryRaw(Prisma.sql`SELECT id, credits_balance FROM users WHERE id = ${original.userId} FOR UPDATE`) as Array<{ id: string; credits_balance: number }>;

      refundBalanceBefore = Number(user[0]?.credits_balance ?? 0);
      refundAmount = Math.abs(original.amount);
      refundBalanceAfter = refundBalanceBefore + refundAmount;

      // Create refund transaction
      await tx.creditTransaction.create({ data: {
        userId: original.userId,
        amount: refundAmount,
        type: "CREDIT_REFUND",
        action: original.action,
        description: `Refund for ${original.id}: ${reason}`,
        metadata: { originalTransactionId: original.id, reason },
        balanceAfter: refundBalanceAfter,
      } });

      // Update user balance
      await tx.user.update({ where: { id: original.userId }, data: { creditsBalance: refundBalanceAfter } });

      // Invalidate cache on refund
      await invalidateBalanceCache(original.userId);

      // Audit log
      await tx.creditAuditLog.create({ data: {
        userId: original.userId,
        action: "REFUND",
        amount: refundAmount,
        balanceBefore: refundBalanceBefore,
        balanceAfter: refundBalanceAfter,
        metadata: { originalTransactionId: original.id, reason },
      } });
    }, { timeout: 30000 });

    // Log refund activity asynchronously
    ActivityLogger.logWithCredits(
      original.userId,
      `${original.action}_REFUND`,
      "REFUND",
      original.entityType || "UNKNOWN",
      original.entityId ?? undefined,
      refundAmount,
      refundBalanceBefore,
      refundBalanceAfter,
      { reason, originalTransactionId: original.id }
    );

    return true;
  }

  async getCostForAction(userId: string, action: string, metadata?: Record<string, any>): Promise<number> {
    // Basic lookup from PricingRule
    const rule = await prisma.pricingRule.findUnique({ where: { action: action as any } });
    let cost = rule?.cost ?? 0;

    // Apply simple subscription discount if user has a role or plan (placeholder)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      // Example: users with theme 'premium' get 20% off (placeholder logic)
      if ((user.theme ?? "") === "premium") cost = Math.ceil(cost * 0.8);
    }

    // Apply simple promotional metadata
    if (metadata?.promoActive) {
      cost = Math.ceil(cost * 0.85);
    }

    return Math.max(1, Math.ceil(cost));
  }
}

const creditDeductionService = new CreditDeductionService();
export default creditDeductionService;
