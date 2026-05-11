// app/api/admin/security/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, isSuperAdmin, UserRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { MFAService } from "@/lib/mfa/mfa.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

// GET /api/admin/security - Fetch security dashboard data including MFA stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch MFA configuration
    const mfaConfig = await MFAService.getConfig();
    
    // Fetch MFA statistics
    const mfaStats = await MFAService.getStats();
    
    // Get detailed MFA adoption by role
    const mfaAdoptionByRole = await prisma.user.groupBy({
      orderBy: { status: "asc" },
      where: {
        roles: {
          some: {
            role: {
              type: { in: ["ADMIN", "SUPER_ADMIN", "USER"] },
            },
          },
        },
      },
      _count: true,
      by: "status"
    });

    const [
      failedLogins,
      blockedUsers,
      activeSessions,
      apiKeys,
      recentSessions,
      adminWithoutMFA,
      mfaVerificationRate,
      recentMFAActivity,
    ] = await Promise.all([
      // Failed login attempts
      prisma.analyticsEvent.count({
        where: { eventType: "USER_LOGIN", createdAt: { gte: dayAgo } },
      }).catch(() => 0),
      
      // Blocked/suspended users
      prisma.user.count({ where: { status: "SUSPENDED" } }).catch(() => 0),
      
      // Active sessions
      prisma.session.count({ where: { expires: { gte: now } } }).catch(() => 0),
      
      // API keys (using account table for OAuth connections)
      prisma.account.count().catch(() => 0),
      
      // Recent sessions
      prisma.session.findMany({
        where: { expires: { gte: now } },
        orderBy: { expires: "desc" },
        take: 10,
        include: {
          user: { select: { email: true, name: true } },
        },
      }).catch(() => []),
      
      // Admins without MFA enabled
      prisma.user.count({
        where: {
          roles: {
            some: {
              role: {
                type: { in: ["ADMIN", "SUPER_ADMIN"] },
              },
            },
          },
          NOT: {
            mfaSettings: {
              isNot: null,
            },
          },
          mfaSettings: {
            enabled: false,
          },
        },
      }).catch(() => 0),
      
      // MFA verification success rate (last 7 days)
      prisma.mFAVerification.aggregate({
        where: {
          createdAt: { gte: weekAgo },
        },
        _count: { success: true },
        _max: { success: true },
      }).catch(() => ({ _count: { success: 0 }, _max: { success: 0 } })),
      
      // Recent MFA activities
      prisma.mFAVerification.findMany({
        where: {
          createdAt: { gte: weekAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      }).catch(() => []),
    ]);

    const recentLogins = recentSessions.map((s) => ({
      user: s.user?.email || s.user?.name || "Unknown",
      ip: "—",
      time: new Date(s.expires).toLocaleString(),
      status: "success" as const,
    }));

    const mfaVerificationTotal = mfaVerificationRate._count?.success || 0;
    const mfaVerificationSuccess = mfaVerificationRate?._max?.success || 0;
    const mfaSuccessRate = mfaVerificationTotal > 0 
      ? Math.round((Number(mfaVerificationSuccess || 0) / Number(mfaVerificationTotal || 1)) * 100) 
      : 0;

    const recentMFAActivityFormatted = recentMFAActivity.map((activity) => ({
      user: activity.user?.email || activity.user?.name || "Unknown",
      method: activity.method,
      success: activity.success,
      time: new Date(activity.createdAt).toLocaleString(),
      ip: activity.ipAddress || "—",
    }));

    return NextResponse.json({
      stats: {
        failedLogins,
        blockedIPs: blockedUsers,
        activeSessions,
        apiKeys,
        adminWithoutMFA,
        mfaAdoptionByRole,
        mfaAdoptionRate: mfaStats.adoptionRate,
        mfaEnabledUsers: mfaStats.totalEnrolled,
        mfaTotalUsers: mfaStats.totalUsers,
        mfaVerificationRate: mfaSuccessRate,
        mfaVerificationTotal,
      },
      mfaConfig: {
        enabled: mfaConfig?.enabled || false,
        enforceForRoles: mfaConfig?.enforceForRoles || [],
        allowedMethods: mfaConfig?.allowedMethods || ["TOTP", "EMAIL"],
        gracePeriodDays: mfaConfig?.gracePeriodDays || 7,
        rememberDevice: mfaConfig?.rememberDevice ?? true,
        rememberDays: mfaConfig?.rememberDays || 30,
        maxAttempts: mfaConfig?.maxAttempts || 5,
        lockoutMinutes: mfaConfig?.lockoutMinutes || 15,
      },
      mfaAdoptionByRole: mfaStats.byMethod || [],
      recentLogins,
      recentMFAActivity: recentMFAActivityFormatted,
    });
  } catch (error) {
    console.error("Security stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/security - Update security settings (including MFA config)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden - Super Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const { setting, value, mfaConfig } = body;

    // Handle MFA configuration update
    if (mfaConfig) {
      const updatedConfig = await MFAService.updateConfig(
        {
          enabled: mfaConfig.enabled,
          enforceForRoles: mfaConfig.enforceForRoles,
          allowedMethods: mfaConfig.allowedMethods,
          gracePeriodDays: mfaConfig.gracePeriodDays,
          rememberDevice: mfaConfig.rememberDevice,
          rememberDays: mfaConfig.rememberDays,
          maxAttempts: mfaConfig.maxAttempts,
          lockoutMinutes: mfaConfig.lockoutMinutes,
          updatedBy: session.user.id,
        },
        session.user.id
      );

      // Log configuration change
      await ActivityLogger.log({
        userId: session.user.id,
        action: "MFA_CONFIG_UPDATED",
        actionType: "UPDATE",
        entityType: "SYSTEM",
        description: "MFA configuration updated",
        metadata: { changes: mfaConfig },
      });

      return NextResponse.json({
        success: true,
        message: "MFA configuration updated successfully",
        config: updatedConfig,
      });
    }

    // Handle other security settings (rate limiting, session timeout, etc.)
    // Store in SystemSetting table
    if (setting && value !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: setting },
        update: { value },
        create: { key: setting, value, description: `Security setting: ${setting}` },
      });

      await ActivityLogger.log({
        userId: session.user.id,
        action: "SECURITY_SETTING_UPDATED",
        actionType: "UPDATE",
        entityType: "SYSTEM",
        description: `Updated security setting: ${setting}`,
        metadata: { setting, value },
      });

      return NextResponse.json({
        success: true,
        message: "Security setting updated successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid request: missing setting or mfaConfig" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Security settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/security - Reset MFA for a specific user (admin action)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden - Super Admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const resetAll = searchParams.get("resetAll") === "true";

    if (resetAll) {
      // Reset MFA for all users (emergency procedure)
      const updated = await prisma.userMFA.updateMany({
        where: { enabled: true },
        data: {
          enabled: false,
          disabledAt: new Date(),
          disabledBy: session.user.id,
        },
      });

      await ActivityLogger.log({
        userId: session.user.id,
        action: "MFA_BULK_RESET",
        actionType: "DELETE",
        entityType: "SYSTEM",
        description: `Reset MFA for ${updated.count} users`,
      });

      return NextResponse.json({
        success: true,
        message: `Reset MFA for ${updated.count} users`,
        count: updated.count,
      });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Reset MFA for specific user
    await MFAService.resetMFA(userId);

    await ActivityLogger.log({
      userId: session.user.id,
      action: "MFA_USER_RESET",
      actionType: "DELETE",
      entityType: "USER",
      entityId: userId,
      description: `Reset MFA for user ${userId}`,
    });

    return NextResponse.json({
      success: true,
      message: "MFA reset successfully for user",
    });
  } catch (error) {
    console.error("MFA reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}