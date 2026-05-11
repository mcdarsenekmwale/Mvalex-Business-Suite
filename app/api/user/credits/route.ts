// app/api/user/credits/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: Get user credits balance and transaction summary
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's current credit balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        creditsBalance: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get credit transaction summary
    const [totalCreditsUsed, totalCreditsAdded, recentTransactions] = await Promise.all([
      // Total credits used
      prisma.creditTransaction.aggregate({
        where: {
          userId,
          type: "CREDIT_DEDUCT",
        },
        _sum: { amount: true },
      }),
      // Total credits added
      prisma.creditTransaction.aggregate({
        where: {
          userId,
          type: "CREDIT_ADD",
        },
        _sum: { amount: true },
      }),
      // Recent transactions (last 5)
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          type: true,
          action: true,
          description: true,
          createdAt: true,
          balanceAfter: true,
        },
      }),
    ]);

    // Calculate estimated days remaining based on last 30 days usage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsage = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        type: "CREDIT_DEDUCT",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    const dailyAverage = (recentUsage._sum.amount || 0) / 30;
    const daysRemaining = dailyAverage > 0 ? Math.floor(user.creditsBalance / dailyAverage) : 0;

    return NextResponse.json({
      success: true,
      data: {
        balance: user.creditsBalance,
        totalUsed: totalCreditsUsed._sum.amount || 0,
        totalAdded: totalCreditsAdded._sum.amount || 0,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        recentTransactions,
        user: {
          name: user.name,
          email: user.email,
        },
      },
    });
    
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// POST: Add credits to user (admin only or purchase)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, reason, paymentId, isAdmin = false } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    
    // Check if admin is adding credits (requires admin role)
    if (isAdmin) {
      const userRoles = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      
      const isAdminUser = userRoles?.roles.some(
        r => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
      );
      
      if (!isAdminUser) {
        return NextResponse.json(
          { error: "Unauthorized: Admin access required" },
          { status: 403 }
        );
      }
    }

    // Get current balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = user.creditsBalance;
    const newBalance = currentBalance + amount;

    // Update user credits and create transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: newBalance },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          type: "CREDIT_ADD",
          action: isAdmin ? "ADMIN_ADD" as const : "CREDIT_PURCHASE" as any,
          description: reason || (isAdmin ? "Admin added credits" : "Credit purchase"),
          balanceAfter: newBalance,
          metadata: paymentId ? { paymentId } : undefined,
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      success: true,
      data: {
        previousBalance: currentBalance,
        newBalance: result.updatedUser.creditsBalance,
        transaction: result.transaction,
      },
    });
    
  } catch (error) {
    console.error("Error adding credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}