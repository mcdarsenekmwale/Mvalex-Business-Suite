import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

interface RewardResult {
  awarded: boolean;
  creditsAwarded?: number;
  reason?: string;
}

class RewardService {
  // Check and award rewards for a specific action
  async checkAndAwardRewards(userId: string, action: string): Promise<RewardResult> {
    // Find matching reward rule
    const rule = await prisma.rewardRule.findUnique({ where: { action } as any });
    if (!rule) return { awarded: false, reason: "No rule" };

    // Check total limit
    if (rule.totalLimit) {
      const totalGiven = await prisma.creditTransaction.count({ where: { userId, type: "CREDIT_BONUS" as any, action: action as any } });
      if (totalGiven >= rule.totalLimit) return { awarded: false, reason: "Total limit reached" };
    }

    // Check daily limit
    if (rule.dailyLimit) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const dailyGiven = await prisma.creditTransaction.count({ where: { userId, type: "CREDIT_BONUS" as any, action: action as any, createdAt: { gte: today, lt: tomorrow } } });
      if (dailyGiven >= rule.dailyLimit) return { awarded: false, reason: "Daily limit reached" };
    }

    // Award credits
    const credits = rule.credits;
    await prisma.$transaction(async (tx) => {
      // Lock user
      await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);

      const user = await tx.user.findUnique({ where: { id: userId } });
      const before = Number(user?.creditsBalance ?? 0);
      const after = before + credits;

      await tx.user.update({ where: { id: userId }, data: { creditsBalance: after } });

      await tx.creditTransaction.create({ data: {
        userId,
        amount: credits,
        type: "CREDIT_BONUS",
        action: action as any,
        description: `Reward: ${action}`,
        balanceAfter: after,
      } });

      await tx.creditAuditLog.create({ data: {
        userId,
        action: `REWARD_${action}`,
        amount: credits,
        balanceBefore: before,
        balanceAfter: after,
        metadata: { source: "reward_rule", ruleId: rule.id },
      } });
    });

    return { awarded: true, creditsAwarded: credits };
  }

  async processDailyLogin(userId: string): Promise<void> {
    // Check streaks and award daily login reward if configured
    await this.checkAndAwardRewards(userId, "DAILY_LOGIN");
  }

  async processReferral(referrerId: string, referredEmail: string): Promise<void> {
    // Basic referral flow: award REFERRAL rule to referrer and welcome bonus to referred when they register
    await this.checkAndAwardRewards(referrerId, "REFER_FRIEND");
  }
}

export default new RewardService();
