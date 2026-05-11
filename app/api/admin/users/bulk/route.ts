import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/permissions";
import { bulkUserActionSchema } from "@/lib/admin/validators";

function checkAdminAuth(session: any) {
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

// POST /api/admin/users/bulk - Bulk actions on users
export async function POST(req: Request) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const { userIds, action, creditsAmount } = bulkUserActionSchema.parse(body);

    const results = { processed: 0, errors: [] as string[] };

    for (const userId of userIds) {
      try {
        if (action === "suspend") {
          await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
        } else if (action === "activate") {
          await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
        } else if (action === "delete") {
          if (userId === session?.user?.id) {
            results.errors.push(`Cannot delete yourself (${userId})`);
            continue;
          }
          await prisma.user.delete({ where: { id: userId } });
        } else if (action === "add_credits" && creditsAmount) {
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
          if (user) {
            const newBalance = (user.creditsBalance ?? 0) + creditsAmount;
            await prisma.user.update({ where: { id: userId }, data: { creditsBalance: newBalance } });
            await prisma.creditTransaction.create({
              data: {
                userId,
                amount: creditsAmount,
                type: "CREDIT_ADD",
                description: `Admin bulk added ${creditsAmount} credits`,
                balanceAfter: newBalance,
              },
            });
          }
        }
        results.processed++;
      } catch (err: any) {
        results.errors.push(`Failed for ${userId}: ${err.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Admin users bulk POST error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk action" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
