// app/api/admin/users/[id]/roles/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";
import { NotificationService } from "@/lib/notifications/notification.service";

// POST /api/admin/users/[id]/roles - Assign role to user
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: userId } = await params;
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user has admin or super admin role
    const currentUserRoles = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: { include: { role: true } } },
    });
    
    const hasAdminAccess = currentUserRoles?.roles.some(
      (r) => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
    );
    
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { roleId, roleName } = body;
    
    // Validate input - either roleId or roleName is required
    if (!roleId && !roleName) {
      return NextResponse.json(
        { error: "Either roleId or roleName is required" },
        { status: 400 }
      );
    }
    
    // Find the role
    let role;
    if (roleId) {
      role = await prisma.role.findUnique({
        where: { id: roleId },
      });
    } else if (roleName) {
      role = await prisma.role.findUnique({
        where: { name: roleName },
      });
    }
    
    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }
    
    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Prevent self-role assignment that could lock out super admins
    if (session.user.id === userId && role.name === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot change your own super admin role" },
        { status: 403 }
      );
    }
    
    // Check if user already has this role
    const hasRole = targetUser.roles.some((r) => r.roleId === role.id);
    
    let result;
    let message;
    
    if (hasRole) {
      // User already has the role - return success but with info
      return NextResponse.json(
        { 
          success: true, 
          message: `User already has the ${role.name} role`,
          alreadyAssigned: true 
        },
        { status: 200 }
      );
    }
    
    // Assign the role
    try {
      result = await prisma.userRole.create({
        data: {
          userId,
          roleId: role.id,
          assignedBy: session.user.id,
        },
        include: {
          role: true,
        },
      });
      message = `Role ${role.name} assigned successfully`;
      
      // Log activity
      await ActivityLogger.log({
        userId: session.user.id,
        action: "ASSIGN_ROLE",
        actionType: "ASSIGN",
        entityType: "USER",
        entityId: userId,
        description: `Assigned role ${role.name} to user ${targetUser.email}`,
        metadata: {
          roleId: role.id,
          roleName: role.name,
          targetUserId: userId,
          targetUserEmail: targetUser.email,
        },
      });
      
      // Send notification to the user
      await NotificationService.send({
        userId: userId,
        title: "Role Updated",
        message: `Your account has been granted the ${role.name} role.`,
        type: "SYSTEM_ALERT",
        metadata: {
          roleId: role.id,
          roleName: role.name,
        },
      });
      
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "User already has this role" },
          { status: 409 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message,
      data: {
        userId,
        role: {
          id: role.id,
          name: role.name,
          type: role.type,
        },
        assignedBy: session.user.id,
        assignedAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error("Error assigning role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/roles - Remove role from user
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: userId } = await params;
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");
    const roleName = searchParams.get("roleName");
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user has admin or super admin role
    const currentUserRoles = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: { include: { role: true } } },
    });
    
    const hasAdminAccess = currentUserRoles?.roles.some(
      (r) => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
    );
    
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    
    // Find the role to remove
    let role;
    if (roleId) {
      role = await prisma.role.findUnique({
        where: { id: roleId },
      });
    } else if (roleName) {
      role = await prisma.role.findUnique({
        where: { name: roleName },
      });
    } else {
      return NextResponse.json(
        { error: "Either roleId or roleName is required" },
        { status: 400 }
      );
    }
    
    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }
    
    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Prevent removing own roles that could lock out super admins
    if (session.user.id === userId && role.name === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot remove your own super admin role" },
        { status: 403 }
      );
    }
    
    // Check if user has at least one admin role before removing
    if (role.type === "ADMIN" || role.type === "SUPER_ADMIN") {
      const adminRoles = targetUser.roles.filter(
        (r) => r.role.type === "ADMIN" || r.role.type === "SUPER_ADMIN"
      );
      
      if (adminRoles.length === 1 && adminRoles[0].roleId === role.id) {
        return NextResponse.json(
          { error: "User must have at least one admin role. Assign another admin role first." },
          { status: 400 }
        );
      }
    }
    
    // Remove the role
    const result = await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: role.id,
      },
    });
    
    if (result.count === 0) {
      return NextResponse.json(
        { error: "User does not have this role" },
        { status: 404 }
      );
    }
    
    // Log activity
    await ActivityLogger.log({
      userId: session.user.id,
      action: "REMOVE_ROLE",
      actionType: "UPDATE",
      entityType: "USER",
      entityId: userId,
      description: `Removed role ${role.name} from user ${targetUser.email}`,
      metadata: {
        roleId: role.id,
        roleName: role.name,
        targetUserId: userId,
        targetUserEmail: targetUser.email,
      },
    });
    
    // Send notification to the user
    await NotificationService.send({
      userId: userId,
      title: "Role Updated",
      message: `The ${role.name} role has been removed from your account.`,
      type: "SYSTEM_ALERT",
      metadata: {
        roleId: role.id,
        roleName: role.name,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Role ${role.name} removed successfully`,
      data: {
        userId,
        role: {
          id: role.id,
          name: role.name,
          type: role.type,
        },
      },
    });
    
  } catch (error) {
    console.error("Error removing role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/admin/users/[id]/roles - Get user roles
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: userId } = await params;
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user has admin or super admin role, or is viewing their own roles
    const isSelf = session.user.id === userId;
    
    if (!isSelf) {
      const currentUserRoles = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { roles: { include: { role: true } } },
      });
      
      const hasAdminAccess = currentUserRoles?.roles.some(
        (r) => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
      );
      
      if (!hasAdminAccess) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }
    }
    
    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
                permissions: {
                  include: {
                    permission: {
                      select: {
                        id: true,
                        name: true,
                        resource: true,
                        action: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Format the response
    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      type: ur.role.type,
      description: ur.role.description,
      permissions: ur.role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
      assignedAt: ur.createdAt,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles,
      },
    });
    
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}