// app/api/admin/permissions/stats/route.ts
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

    // Initialize variables with defaults
    let stats: any = {};
    let permissions: any[] = [];
    let totalPermissions = 0;
    let totalAssignments = 0;
    let averageAssignmentsPerPermission = 0;
    let mostAssignedPermission = { name: "N/A", count: 0 };
    let leastAssignedPermission = { name: "N/A", count: 0 };
    let unusedPermissions: any[] = [];
    let resourceGroups: Record<string, any[]> = {};
    let resourceCoverage: any[] = [];
    let permissionHeatmap: Record<string, Record<string, number>> = {};
    let permissionCreationTrend: Array<{ month: string; count: number }> = [];
    let redundantPermissions: Array<{ key: string; count: number }> = [];
    let completionScore = 0;
    
    // Try to fetch permissions
    try {
      permissions = await prisma.permission.findMany({
        include: {
          _count: {
            select: {
              roles: true,
            },
          },
        },
      });
      
      totalPermissions = permissions.length;
      
      // Calculate total assignments
      totalAssignments = permissions.reduce((sum, perm) => sum + (perm._count?.roles || 0), 0);
      averageAssignmentsPerPermission = totalPermissions > 0 ? totalAssignments / totalPermissions : 0;
      
      // Find most and least assigned permissions
      permissions.forEach(perm => {
        const count = perm._count?.roles || 0;
        if (count > mostAssignedPermission.count) {
          mostAssignedPermission = { name: perm.name || "N/A", count };
        }
        if (count < leastAssignedPermission.count && count > 0) {
          leastAssignedPermission = { name: perm.name || "N/A", count };
        }
      });
      
      // Find unused permissions
      unusedPermissions = permissions.filter(perm => (perm._count?.roles || 0) === 0);
      
      // Count permissions by resource
      const permissionsByResource = permissions.reduce((acc, perm) => {
        acc[perm.resource] = (acc[perm.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count permissions by action
      const permissionsByAction = permissions.reduce((acc, perm) => {
        acc[perm.action] = (acc[perm.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Group permissions by resource
      resourceGroups = permissions.reduce((acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = [];
        }
        acc[perm.resource].push({
          name: perm.name,
          action: perm.action,
          roleCount: perm._count?.roles || 0,
          description: perm.description,
        });
        return acc;
      }, {} as Record<string, any[]>);
      
      // Calculate resource coverage
      resourceCoverage = Object.entries(resourceGroups).map(([resource, perms]) => {
        const actions = perms.map(p => p.action);
        const hasCreate = actions.includes("create");
        const hasRead = actions.includes("read");
        const hasUpdate = actions.includes("update");
        const hasDelete = actions.includes("delete");
        
        const coverageScore = [hasCreate, hasRead, hasUpdate, hasDelete].filter(Boolean).length;
        
        return {
          resource,
          totalPermissions: perms.length,
          coverageScore,
          hasCreate,
          hasRead,
          hasUpdate,
          hasDelete,
          permissions: perms,
        };
      });
      
      // Calculate permission redundancy
      const permissionMap = new Map<string, number>();
      permissions.forEach(perm => {
        const key = `${perm.resource}:${perm.action}`;
        permissionMap.set(key, (permissionMap.get(key) || 0) + 1);
      });
      
      redundantPermissions = Array.from(permissionMap.entries())
        .filter(([_, count]) => count > 1)
        .map(([key, count]) => ({ key, count }));
      
      // Calculate completion score
      const avgAssignments = averageAssignmentsPerPermission;
      if (totalPermissions > 0 && avgAssignments > 0) {
        const variance = permissions.reduce((sum, perm) => {
          return sum + Math.pow((perm._count?.roles || 0) - avgAssignments, 2);
        }, 0) / totalPermissions;
        completionScore = Math.max(0, Math.min(100, 100 - (variance / avgAssignments) * 10));
      }
      
      // Add these to stats
      (stats as any).permissionsByResource = permissionsByResource;
      (stats as any).permissionsByAction = permissionsByAction;
      
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.warn("Permission table doesn't exist yet. Run migrations first.");
        // Return empty stats with helpful message
        return NextResponse.json({ 
          stats: {
            totalPermissions: 0,
            totalAssignments: 0,
            averageAssignmentsPerPermission: 0,
            mostAssignedPermission: { name: "N/A", count: 0 },
            leastAssignedPermission: null,
            permissionsByResource: {},
            permissionsByAction: {},
            resourceCoverage: [],
            unusedPermissions: [],
            unusedPermissionsCount: 0,
            permissionCreationTrend: [],
            permissionHeatmap: {},
            redundantPermissions: [],
            redundantPermissionsCount: 0,
            completionScore: 0,
            generatedAt: new Date().toISOString(),
            warning: "Run 'npx prisma migrate dev' to create required tables"
          }
        });
      }
      throw error;
    }
    
    // Try to get permission usage heatmap (by role type) - handle missing Role table
    try {
      const roleTypes = ["USER", "ADMIN", "SUPER_ADMIN"];
      
      for (const roleType of roleTypes) {
        const roles = await prisma.role.findMany({
          where: { type: roleType as any },
          include: {
            permissions: true,
          },
        });
        
        const permissionCounts: Record<string, number> = {};
        roles.forEach(role => {
          role.permissions.forEach((perm: any) => {
            permissionCounts[perm.name] = (permissionCounts[perm.name] || 0) + 1;
          });
        });
        
        permissionHeatmap[roleType] = permissionCounts;
      }
    } catch (error) {
      console.warn("Could not fetch role heatmap data:", error);
      permissionHeatmap = {};
    }
    
    // Try to get permission creation trend using Prisma ORM instead of raw SQL
    try {
      const permissionsWithDates = await prisma.permission.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      
      const monthCounts: Record<string, number> = {};
      permissionsWithDates.forEach(perm => {
        const monthKey = perm.createdAt.toISOString().slice(0, 7); // YYYY-MM
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
      
      permissionCreationTrend = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .slice(-6);
    } catch (error) {
      console.warn("Could not calculate permission creation trend");
      permissionCreationTrend = [];
    }
    
    stats = {
      // Basic counts
      totalPermissions,
      totalAssignments,
      averageAssignmentsPerPermission: Math.round(averageAssignmentsPerPermission * 100) / 100,
      
      // Distribution
      permissionsByResource: (stats as any)?.permissionsByResource || {},
      permissionsByAction: (stats as any)?.permissionsByAction || {},
      resourceCoverage,
      
      // Top performers
      mostAssignedPermission,
      leastAssignedPermission: leastAssignedPermission.name !== "N/A" ? leastAssignedPermission : null,
      
      // Unused permissions
      unusedPermissions: unusedPermissions.map(p => ({
        id: p.id,
        name: p.name,
        resource: p.resource,
        action: p.action,
        description: p.description,
      })),
      unusedPermissionsCount: unusedPermissions.length,
      
      // Trends
      permissionCreationTrend,
      
      // Heatmap
      permissionHeatmap,
      
      // Quality metrics
      redundantPermissions,
      redundantPermissionsCount: redundantPermissions.length,
      completionScore: Math.round(completionScore),
      
      // Timestamp
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ stats });
    
  } catch (error) {
    console.error("Error fetching permission statistics:", error);
    
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