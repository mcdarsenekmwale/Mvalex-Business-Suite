import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin, type UserRole } from "@/lib/auth/permissions";
import { MFAService } from "@/lib/mfa/mfa.service";
import { type Prisma } from "@/generated/prisma/client";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

// GET /api/admin/mfa/config - Get MFA configuration
export async function GET() {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
        
    const config = await MFAService.getConfig();
    const stats = await MFAService.getStats();

    if (!config) {
      return NextResponse.json({ config: null });
    }
    return NextResponse.json({
      config: {
        id: config.id,
        enabled: config?.enabled || false,
        enforceForRoles: config?.enforceForRoles || ["ADMIN", "SUPER_ADMIN"],
        allowedMethods: config?.allowedMethods || ["TOTP", "EMAIL"],
        gracePeriodDays: config?.gracePeriodDays || 7,
        rememberDevice: config?.rememberDevice ?? true,
        rememberDays: config?.rememberDays || 30,
        maxAttempts: config?.maxAttempts || 5,
        lockoutMinutes: config?.lockoutMinutes || 15,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt,
        createdAt: config.createdAt,
        is2FAEnabled: config.enabled,
        isAdmin2FARequired: config.enforceForRoles.includes("ADMIN") || config.enforceForRoles.includes("SUPER_ADMIN"),
      },
      stats: {
        totalEnabled: stats.totalEnrolled,
        totalUsers: stats.totalUsers,
        adoptionRate: stats.adoptionRate,
        byMethod: stats.byMethod,
      },
    });
  } catch (error) {
    console.error("Error fetching MFA config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update MFA config
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      enabled,
      enforceForRoles,
      allowedMethods,
      gracePeriodDays,
      rememberDevice,
      rememberDays,
      maxAttempts,
      lockoutMinutes,
    } = body;

    // Validate input
    if (gracePeriodDays !== undefined && (gracePeriodDays < 0 || gracePeriodDays > 90)) {
      return NextResponse.json(
        { error: "Grace period must be between 0 and 90 days" },
        { status: 400 }
      );
    }

    if (rememberDays !== undefined && (rememberDays < 1 || rememberDays > 365)) {
      return NextResponse.json(
        { error: "Remember days must be between 1 and 365" },
        { status: 400 }
      );
    }

    if (maxAttempts !== undefined && (maxAttempts < 1 || maxAttempts > 20)) {
      return NextResponse.json(
        { error: "Max attempts must be between 1 and 20" },
        { status: 400 }
      );
    }

    if (lockoutMinutes !== undefined && (lockoutMinutes < 1 || lockoutMinutes > 1440)) {
      return NextResponse.json(
        { error: "Lockout minutes must be between 1 and 1440" },
        { status: 400 }
      );
    }

    // Build enforceForRoles from toggles
    if (body.isAdmin2FARequired) {
      enforceForRoles.push("ADMIN", "SUPER_ADMIN");
    }

    if (body.is2FAEnabled) {
      enforceForRoles.push("USER", "SUPPORT_AGENT", "SUPPORT_MANAGER", "USER_ADMIN", "AUDIT_MANAGER", "GLOBAL_READER", "VIEWER");
    }

    // Update MFA config
    const mfaConfigInput: Prisma.MFAConfigUpdateInput = {
      updatedBy: session.user.id,
      enabled: body.is2FAEnabled || body.isAdmin2FARequired,
      enforceForRoles,
      allowedMethods: body.allowedMethods || ["TOTP", "EMAIL", "SMS"],
      gracePeriodDays,
      rememberDevice,
      rememberDays,
      maxAttempts,
      lockoutMinutes,
      updatedAt: new Date(),
    };

    const config = await MFAService.updateConfig(mfaConfigInput, session.user.id);
    
    await ActivityLogger.log({
      userId: session.user.id,
      action: "MFA_CONFIG_UPDATED",
      actionType: "UPDATE",
      entityType: "SYSTEM",
      description: "MFA configuration updated",
      metadata: {
        enabled,
        enforceForRoles,
        allowedMethods,
        gracePeriodDays,
        rememberDevice,
        rememberDays,
        maxAttempts,
        lockoutMinutes,
      },
    });

    return NextResponse.json({
      success: true,
      message: "MFA configuration updated successfully",
      config,
    });
  } catch (error) {
    console.error("Error updating MFA config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


// POST /api/admin/mfa/config/test - Test MFA configuration (send test notification)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { method, recipient } = await req.json();

    if (!method || !recipient) {
      return NextResponse.json(
        { error: "Missing method or recipient" },
        { status: 400 }
      );
    }

    // Send test notification based on method
    if (method === "EMAIL") {
      await MFAService.sendEmailCode(session.user.id, recipient);
    } else if (method === "SMS") {
      await MFAService.sendSMSCode(session.user.id, recipient);
    } else {
      return NextResponse.json(
        { error: "Unsupported method for test" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${method.toUpperCase()} sent to ${recipient}`,
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}