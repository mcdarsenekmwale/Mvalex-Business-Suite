// app/api/admin/roles/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if tables exist first
    let roles: any[] = [];
    let allRolePermissions: any[] = [];
    let totalPermissions = 0;
    let recentAssignments = 0;
    
    try {
      // Try to fetch roles
      roles = await prisma.role.findMany({
        include: {
          _count: {
            select: {
              users: true,
              permissions: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.warn("Role table doesn't exist yet. Run migrations first.");
        // Return empty stats with helpful message
        return NextResponse.json({ 
          stats: {
            totalRoles: 0,
            systemRoles: 0,
            customRoles: 0,
            totalUsersWithRoles: 0,
            averageUsersPerRole: 0,
            averagePermissionsPerRole: 0,
            mostAssignedPermission: "N/A",
            roleDistribution: {},
            usersByRole: [],
            permissionsByRole: [],
            roleCreationTrend: [],
            recentAssignments: 0,
            unassignedUsers: 0,
            unassignedPercentage: 0,
            roleUtilizationRate: 0,
            permissionUtilizationRate: 0,
            orphanedRoles: [],
            orphanedRolesCount: 0,
            generatedAt: new Date().toISOString(),
            warning: "Run 'npx prisma migrate dev' to create required tables"
          }
        });
      }
      throw error;
    }

    // Try to get role permissions
    try {
      allRolePermissions = await prisma.rolePermission.findMany({
        include: {
          permission: true,
        },
      });
    } catch (error) {
      console.warn("RolePermission table not available");
    }

    // Try to get total permissions
    try {
      totalPermissions = await prisma.permission.count();
    } catch (error) {
      console.warn("Permission table not available");
    }

    // Try to get recent assignments
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      recentAssignments = await prisma.userRole.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });
    } catch (error) {
      console.warn("UserRole table not available");
    }

    // Calculate stats only if we have roles
    const totalRoles = roles.length;
    const systemRoles = roles.filter(r => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;
    const totalUsersWithRoles = roles.reduce((sum, role) => sum + (role._count?.users || 0), 0);
    const averageUsersPerRole = totalRoles > 0 ? Math.round(totalUsersWithRoles / totalRoles) : 0;
    const averagePermissionsPerRole = totalRoles > 0 
      ? Math.round(roles.reduce((sum, role) => sum + (role._count?.permissions || 0), 0) / totalRoles)
      : 0;
    
    // Find most assigned permission
    const permissionCounts: Record<string, number> = {};
    allRolePermissions.forEach(rp => {
      if (rp.permission?.name) {
        const permName = rp.permission.name;
        permissionCounts[permName] = (permissionCounts[permName] || 0) + 1;
      }
    });
    
    let mostAssignedPermission = "N/A";
    let maxCount = 0;
    Object.entries(permissionCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostAssignedPermission = name;
      }
    });
    
    // Get role distribution by type
    const roleDistribution = roles.reduce((acc, role) => {
      acc[role.type] = (acc[role.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get user count by role
    const usersByRole = roles
      .map(role => ({
        name: role.name,
        userCount: role._count?.users || 0,
        type: role.type,
      }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 5);
    
    // Get permission count by role
    const permissionsByRole = roles
      .map(role => ({
        name: role.name,
        permissionCount: role._count?.permissions || 0,
        type: role.type,
      }))
      .sort((a, b) => b.permissionCount - a.permissionCount)
      .slice(0, 5);
    
    // Calculate role creation trend (using Prisma ORM instead of raw SQL)
    let roleCreationTrend: Array<{ month: string; count: number }> = [];
    try {
      const rolesWithDates = await prisma.role.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      
      const monthCounts: Record<string, number> = {};
      rolesWithDates.forEach(role => {
        const monthKey = role.createdAt.toISOString().slice(0, 7); // YYYY-MM
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
      
      roleCreationTrend = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .slice(-6);
    } catch (error) {
      console.warn("Could not calculate role creation trend");
      roleCreationTrend = [];
    }
    
    // Get unassigned users
    const allUsers = await prisma.user.count();
    const unassignedUsers = allUsers - totalUsersWithRoles;
    const unassignedPercentage = allUsers > 0 ? Math.round((unassignedUsers / allUsers) * 100) : 0;
    
    // Get role utilization score
    const activeRoles = roles.filter(r => (r._count?.users || 0) > 0).length;
    const roleUtilizationRate = totalRoles > 0 ? Math.round((activeRoles / totalRoles) * 100) : 0;
    
    // Get permission utilization
    const assignedPermissions = allRolePermissions.length;
    const permissionUtilizationRate = totalPermissions > 0 ? Math.round((assignedPermissions / totalPermissions) * 100) : 0;
    
    // Find orphaned roles
    const orphanedRoles = roles.filter(r => 
      (r._count?.users || 0) === 0 && 
      (r._count?.permissions || 0) === 0 && 
      !r.isSystem
    );
    
    const stats = {
      totalRoles,
      systemRoles,
      customRoles,
      totalUsersWithRoles,
      averageUsersPerRole,
      averagePermissionsPerRole,
      mostAssignedPermission,
      roleDistribution,
      usersByRole,
      permissionsByRole,
      roleCreationTrend,
      recentAssignments,
      unassignedUsers,
      unassignedPercentage,
      roleUtilizationRate,
      permissionUtilizationRate,
      orphanedRoles: orphanedRoles.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        createdAt: r.createdAt,
      })),
      orphanedRolesCount: orphanedRoles.length,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ stats });
    
  } catch (error) {
    console.error("Error fetching role statistics:", error);
    
    // Return a more helpful error message
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (error.message.includes('does not exist')) {
        errorMessage = "Database tables not set up. Please run database migrations first.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}