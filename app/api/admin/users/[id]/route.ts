import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/permissions";
import { getUserById, getUserActivity } from "@/lib/admin/queries";

function checkAdminAuth(session: any) {
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

// GET /api/admin/users/[id] - Get user details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { id } = await params;
    const [user, activity] = await Promise.all([
      getUserById(id),
      getUserActivity(id, 20),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }


    // Get last login from activities
    const lastActivity = await prisma.userActivity.findFirst({
      where: {
        id,
        action: "LOGIN",
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
      creditsBalance: user.creditsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      lastLogin: lastActivity?.createdAt,
      roles: user.roles.map(r => r.role.name),
      primaryRole: user.roles[0]?.role?.name || "USER",
      counts: {
        businessCards: user._count.businessCards,
        invoices: user._count.invoices,
        logos: user._count.logos,
        exports: user._count.exports,
        tickets: user._count.supportTickets,
      },
    };

    return NextResponse.json({ user: formattedUser, activity });
  } catch (error) {
    console.error("Admin user GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Partial update
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;

    if (body.credits !== undefined) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { creditsBalance: true },
      });

      if (user) {
        const currentCredits = user.creditsBalance ?? 0;
        const diff = body.credits - currentCredits;
        updateData.creditsBalance = body.credits;

        if (diff !== 0) {
          await prisma.creditTransaction.create({
            data: {
              userId: id,
              amount: Math.abs(diff),
              type: diff > 0 ? "CREDIT_ADD" : "CREDIT_DEDUCT",
              description: `Admin ${diff > 0 ? "added" : "removed"} ${Math.abs(diff)} credits`,
              balanceAfter: body.credits,
            },
          });
        }
      }
    }

    if (body.role) {
      const roleRecord = await prisma.role.findFirst({
        where: { type: body.role as any },
      });

      if (roleRecord) {
        await prisma.userRole.deleteMany({ where: { userId: id } });
        await prisma.userRole.create({
          data: { userId: id, roleId: roleRecord.id },
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: { include: { role: true } },
        _count: {
          select: {
            businessCards: true,
            invoices: true,
            logos: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin user PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { id } = await params;

    // Prevent self-deletion
    if (id === session?.user?.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
