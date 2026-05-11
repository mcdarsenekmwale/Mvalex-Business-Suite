import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, UserRole } from "@/lib/auth/permissions";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = {
      now: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      uptime: process.uptime?.() || 0,
      version: process.env.npm_package_version || null,
    };

    // In the GET response, include MFA config
    const mfaConfig = await MFAService.getConfig();
    return NextResponse.json({
      settings: payload,
      mfaConfig: {
        enabled: mfaConfig?.enabled || false,
        enforceForRoles: mfaConfig?.enforceForRoles || ["ADMIN"],
        allowedMethods: mfaConfig?.allowedMethods || ["TOTP"],
        gracePeriodDays: mfaConfig?.gracePeriodDays || 7,
      },
    });
    
  } catch (error) {
    console.error("System GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    // Placeholder: accept basic config updates (store in external system in future)
    // Add MFA-specific settings to system settings update
    if (body.mfa) {
      await MFAService.updateConfig(body.mfa, session.user.id);
    }
    return NextResponse.json({ ok: true, received: body });
  } catch (error) {
    console.error("System POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

