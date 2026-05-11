import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, UserRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuditLogService } from "@/lib/audit/audit-log.service";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
    return null;
  }
  return session;
}

// Get users
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const role = url.searchParams.get("role") || undefined;
    const exportFormat = url.searchParams.get("export") || undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status as any;
    if (role) where.roles = { some: { role: { name: { in: role.split(",") } } } };

    // simple role filter via relation
    const include = {
      roles: { include: { role: true } },
      _count: { select: { businessCards: true, invoices: true, logos: true } },
    } as any;

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include,
    });

    const mapped = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      status: u.status,
      creditsBalance: (u as any).creditsBalance ?? 0,
      createdAt: u.createdAt,
      roles: (u.roles || []).map((r: any) => ({
        type: r.role?.type || r.role?.name,
        name: r.role?.name || r.role?.type,
      })).filter(Boolean),
      _count: (u as any)._count,
    }));

    if (exportFormat === "csv") {
      const header = ["id", "email", "name", "roles", "status", "creditsBalance", "createdAt"];
      const rows = mapped.map((r: any) => [
        r.id,
        r.email,
        (r.name || "").replace(/"/g, '""'),
        (r.roles || []).map((r: any) => r.type).filter(Boolean).join("|").replace(/"/g, '""'),
        String(r.status),
        String(r.creditsBalance || 0),
        r.createdAt.toISOString(),
      ]);

      const csv = [header.join(","), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(","))].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mvalex-users-${new Date().toISOString()}.csv"`,
        },
      });
    }

    return NextResponse.json({ users: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create user
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { email, name, password, role } = body as { email?: string; name?: string; password?: string; role?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "User exists" }, { status: 409 });

    const data: any = { email, name };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({ data });

    if (role) {
      const roleRecord = await prisma.role.findFirst({ where: { type: role } as any });
      if (roleRecord) {
        await prisma.userRole.create({ data: { userId: created.id, roleId: roleRecord.id, assignedBy: session.user.id } });
      }
    }

    const out = await prisma.user.findUnique({ where: { id: created.id }, include: { roles: { include: { role: true } } } });

    AuditLogService.logUserAction(
      session.user.id,
      "USER_CREATED",
      created.id,
      { email, name, role }
    );

    return NextResponse.json({ user: out }, { status: 201 });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update user
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, name, status, role, credits } = body as any;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (credits !== undefined) updateData.creditsBalance = credits;

    // credits transaction
    if (credits !== undefined) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (user) {
        const diff = (credits || 0) - (user.creditsBalance || 0);
        if (diff !== 0) {
          await prisma.creditTransaction.create({ data: { userId, amount: Math.abs(diff), type: diff > 0 ? 'CREDIT_ADD' : 'CREDIT_DEDUCT', description: `Admin adjusted credits by ${diff}`, balanceAfter: credits } });
        }
      }
    }

    // role update
    if (role) {
      const roleRecord = await prisma.role.findUnique({ where: { type: role } as any });
      if (roleRecord) {
        await prisma.userRole.deleteMany({ where: { userId } });
        await prisma.userRole.create({ data: { userId, roleId: roleRecord.id, assignedBy: session.user.id } });
      }
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData, include: { roles: { include: { role: true } } } });

    AuditLogService.logUserAction(
      session.user.id,
      "USER_UPDATED",
      userId,
      { name, status, credits, role }
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const userToDelete = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    await prisma.user.delete({ where: { id: userId } });

    AuditLogService.logUserAction(
      session.user.id,
      "USER_DELETED",
      userId,
      { email: userToDelete?.email, name: userToDelete?.name }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin users DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


// Bulk action
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  try {
    const body = await req.json();
    const { userId, name, roleId, status, credits } = body as any;
    if (!userId || !name || !roleId || !credits || !status) return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (roleId !== undefined) update.roleId = roleId;
    if (status !== undefined) update.status = status;
    if (credits !== undefined) update.creditsBalance = credits;

    // credits transaction
    if (credits !== undefined) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (user) {
        const diff = (credits || 0) - (user.creditsBalance || 0);
        if (diff !== 0) {
          await prisma.creditTransaction.create({ data: { userId, amount: Math.abs(diff), type: diff > 0 ? 'CREDIT_ADD' : 'CREDIT_DEDUCT', description: `Admin adjusted credits by ${diff}`, balanceAfter: credits } });
        }
      }
    }

    // role update
    if (roleId) {
      const roleRecord = await prisma.role.findUnique({ where: { id: roleId } as any });
      if (roleRecord) {
        await prisma.userRole.deleteMany({ where: { userId } });
        await prisma.userRole.create({ data: { userId, roleId: roleRecord.id, assignedBy: session.user.id } });
      }
    }

    // update user
    const updated = await prisma.user.update({ 
      where: { id: userId }, 
      data: {
        name,
        status,
        creditsBalance: credits,
      }, 
      include: { roles: { include: { role: true } } } 
    });

    AuditLogService.logUserAction(
      session.user.id,
      "USER_UPDATED",
      userId,
      { name, roleId, status, credits }
    );

    return NextResponse.json({ 
      user: updated ,
      success: true
    });
  } catch (error) {
    console.error("Admin users PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
