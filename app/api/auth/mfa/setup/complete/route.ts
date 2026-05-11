// app/api/auth/mfa/setup/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, deviceName, trustDevice } = await req.json();
    const userId = session.user.id;

    const verified = await MFAService.verifyAndEnableTOTP(
      userId,
      token,
      deviceName,
      req.headers.get("x-forwarded-for") || undefined,
      req.headers.get("user-agent") || undefined
    );

    if (!verified) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    
    // Update MFA enabled cookie
    response.cookies.set(`mfa_enabled_${userId}`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    
    // Set verification cookie
    response.cookies.set(`mfa_verified_${userId}`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60,
    });

    if (trustDevice) {
      const deviceId = crypto.randomUUID();
      response.cookies.set(`mfa_device_trusted_${deviceId}`, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
      response.cookies.set("mfa_device_id", deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Update session
    await fetch(`${process.env.NEXTAUTH_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        mfaSetupComplete: true,
        mfaVerified: true,
        mfaVerifiedAt: Date.now(),
      }),
    });

    return response;
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}