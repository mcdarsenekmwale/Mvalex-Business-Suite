import { prisma } from "@/lib/prisma";

export interface UserPermissions {
  userId: string;
  permissions: Set<string>;
  roles: string[];
}

class PermissionManagerClass {
  private cache = new Map<string, UserPermissions & { timestamp: number }>();
  private cacheTTL = 60000; // 1 minute

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        userId: cached.userId,
        permissions: cached.permissions,
        roles: cached.roles,
      };
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: { name: true },
          include: {
            permissions: {
              include: {
                permission: {
                  select: { name: true, resource: true, action: true },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    const roles: string[] = [];

    for (const userRole of userRoles) {
      roles.push(userRole.role.name);
      for (const rp of userRole.role.permissions) {
        const perm = rp.permission;
        // Use name if available, otherwise derive from resource:action
        const permName = perm.name || `${perm.resource}:${perm.action}`;
        permissions.add(permName);
        // Also add resource:action format for flexibility
        permissions.add(`${perm.resource}:${perm.action}`);
      }
    }

    const result = {
      userId,
      permissions,
      roles,
      timestamp: Date.now(),
    };

    this.cache.set(userId, result);
    return { userId, permissions, roles };
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.permissions.has(permissionName);
  }

  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissionNames.some((p) => userPermissions.permissions.has(p));
  }

  async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissionNames.every((p) => userPermissions.permissions.has(p));
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.roles;
  }

  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}

export const PermissionManager = new PermissionManagerClass();
