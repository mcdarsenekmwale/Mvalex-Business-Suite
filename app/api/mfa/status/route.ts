// app/api/auth/mfa/status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await MFAService.getMFAStatus(session.user.id);
    const config = await MFAService.getConfig();
    const requiresMFA = await MFAService.requiresMFA(session.user.id, session.user.role || "USER");

      // Check MFA requirements
    const isMFAEnabled = await MFAService.isMFAEnabled(session.user.id);
    
    // Check if user has verified MFA during this session
    const mfaVerified = session.user.mfaVerifiedAt !== undefined;
    
    // Get cookie-based verification status (for middleware compatibility)
    const cookieStore = await import("next/headers").then(m => m.cookies);
    const mfaVerifiedCookie = (await cookieStore()).get(`mfa_verified_${session.user.id}`)?.value === "true";
    const mfaDeviceTrusted = (await cookieStore()).get("mfa_device_id")?.value 
      ? (await cookieStore()).get(`mfa_device_trusted_${(await cookieStore()).get("mfa_device_id")?.value}`)?.value === "true"
      : false;
    
    const requiresMFAVerification = isMFAEnabled && !mfaVerified && !mfaVerifiedCookie && !mfaDeviceTrusted;

    return NextResponse.json({
      ...status,
      requiresMFA,
      requiresMFAVerification,
      isMFAEnabled,
      mfaVerified,
      mfaVerifiedCookie,
      mfaDeviceTrusted,
      config: config
        ? {
            enabled: config.enabled,
            allowedMethods: config.allowedMethods,
            gracePeriodDays: config.gracePeriodDays,
            rememberDevice: config.rememberDevice,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching MFA status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await MFAService.disableMFA(session.user.id, "User requested disable");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disabling MFA:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
