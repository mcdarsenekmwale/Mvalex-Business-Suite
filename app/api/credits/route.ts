import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CREDIT_COSTS } from "@/lib/constants";
import { getCachedBalance, setCachedBalance } from "@/lib/redis";
import { CreditEventListeners } from "@/lib/listeners/credit-listeners";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try cache first
    let balance = await getCachedBalance(session.user.id);
    let cacheHit = balance !== null;

    if (balance === null) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { creditsBalance: true },
      });
      balance = user?.creditsBalance || 0;
      await setCachedBalance(session.user.id, balance);
    }

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const pricingRules = await prisma.pricingRule.findMany({
      where: { isActive: true },
    });

    return NextResponse.json({
      balance,
      cacheHit,
      transactions,
      pricing: pricingRules,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, amount, description, entityType, entityId } = await req.json();
    const idempotencyKey = (req.headers && (req.headers as any).get?.("idempotency-key")) || undefined;
    if (idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
      if (existing && existing.consumed && existing.responseData) {
        return NextResponse.json(existing.responseData);
      }
      if (!existing) {
        await prisma.idempotencyKey.create({ data: { key: idempotencyKey, userId: session.user.id } });
      }
    }

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const pricingRule = await prisma.pricingRule.findUnique({
      where: { action },
    });

    const cost = amount || pricingRule?.cost || CREDIT_COSTS[action as keyof typeof CREDIT_COSTS] || 0;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditsBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = (user.creditsBalance || 0) as number;
    let newBalance = currentBalance;
    let transactionType = "CREDIT_DEDUCT";

    if (cost > 0) {
      if (currentBalance < cost) {
        return NextResponse.json(
          { error: "Insufficient credits", currentBalance, required: cost },
          { status: 402 }
        );
      }
      newBalance = currentBalance - cost;
    } else if (cost < 0) {
      newBalance = currentBalance + Math.abs(cost);
      transactionType = "CREDIT_ADD";
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { creditsBalance: newBalance },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: Math.abs(cost),
          type: transactionType as any,
          action: action as any,
          entityType,
          entityId,
          description,
          balanceAfter: newBalance,
        },
      }),
    ]);

    if (transactionType === "CREDIT_ADD") {
      await CreditEventListeners.onCreditAdded(session.user.id, Math.abs(cost), newBalance, description);
    } else {
      await CreditEventListeners.checkLowCredit(session.user.id, newBalance);
    }
    await setCachedBalance(session.user.id, newBalance);

    if (idempotencyKey) {
      await prisma.idempotencyKey.update({ where: { key: idempotencyKey }, data: { consumed: true, responseData: { success: true, previousBalance: currentBalance, newBalance, cost } } });
    }

    return NextResponse.json({
      success: true,
      previousBalance: currentBalance,
      newBalance,
      cost,
    });
  } catch (error) {
    console.error("Error processing credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}