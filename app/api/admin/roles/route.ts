import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { AuditLogService } from "@/lib/audit/audit-log.service";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        users: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { users: true, permissions: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      type: role.type,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
      createdAt: role.createdAt,
    }));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Admin roles GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { name, description, permissionIds } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Role already exists" }, { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        type: "USER",
        isSystem: false,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((pid: string) => ({
                permissionId: pid,
                grantedBy: session.user.id,
              })),
            }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    AuditLogService.logRoleAction(
      session.user.id,
      "ROLE_CREATED",
      role.id,
      { name, description, permissions: permissionIds }
    );

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Admin roles POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, name, description, permissionIds } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    if (existing.isSystem) {
      return NextResponse.json({ error: "Cannot modify system roles" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      include: { permissions: { include: { permission: true } } },
    });

    // Update permissions if provided
    if (permissionIds !== undefined) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((pid: string) => ({
            roleId: id,
            permissionId: pid,
            grantedBy: session.user.id,
          })),
        });
      }
    }

    AuditLogService.logRoleAction(
      session.user.id,
      "ROLE_UPDATED",
      id,
      { name, description, permissions: permissionIds }
    );

    return NextResponse.json(role);
  } catch (error) {
    console.error("Admin roles PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    if (existing.isSystem) {
      return NextResponse.json({ error: "Cannot delete system roles" }, { status: 403 });
    }

    await prisma.role.delete({ where: { id } });

    AuditLogService.logRoleAction(session.user.id, "ROLE_DELETED", id, {
      name: existing.name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin roles DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
