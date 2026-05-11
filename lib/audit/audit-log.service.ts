import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  changes?: any;
  severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  metadata?: Record<string, any>;
}

export class AuditLogService {
  static async log(data: AuditLogData): Promise<void> {
    try {
      let ipAddress: string | undefined;
      let userAgent: string | undefined;

      try {
        const headersList = await headers();
        ipAddress =
          headersList.get("x-forwarded-for") ||
          headersList.get("x-real-ip") ||
          undefined;
        userAgent = headersList.get("user-agent") || undefined;
      } catch {
        // Not in request context
      }

      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValue: data.oldValue ?? null,
          newValue: data.newValue ?? null,
          changes: data.changes ?? null,
          ipAddress,
          userAgent,
          severity: (data.severity || "INFO") as any,
        },
      });
    } catch (error) {
      console.error("[AuditLogService] Failed to create audit log:", error);
    }
  }

  static logAsync(data: AuditLogData): void {
    this.log(data).catch((err) => {
      console.error("[AuditLogService] Async log failed:", err);
    });
  }

  static logUserAction(
    userId: string,
    action: string,
    targetUserId?: string,
    changes?: any,
    severity?: AuditLogData["severity"]
  ): void {
    this.logAsync({
      userId,
      action,
      entityType: "USER",
      entityId: targetUserId,
      changes,
      severity,
    });
  }

  static logRoleAction(
    userId: string,
    action: string,
    roleId: string,
    changes?: any,
    severity?: AuditLogData["severity"]
  ): void {
    this.logAsync({
      userId,
      action,
      entityType: "ROLE",
      entityId: roleId,
      changes,
      severity,
    });
  }

  static logPermissionAction(
    userId: string,
    action: string,
    permissionId: string,
    changes?: any,
    severity?: AuditLogData["severity"]
  ): void {
    this.logAsync({
      userId,
      action,
      entityType: "PERMISSION",
      entityId: permissionId,
      changes,
      severity,
    });
  }

  static logSecurityEvent(
    userId: string | undefined,
    action: string,
    description: string,
    severity: AuditLogData["severity"] = "WARNING"
  ): void {
    this.logAsync({
      userId,
      action,
      entityType: "SECURITY",
      changes: { description },
      severity,
    });
  }
}
