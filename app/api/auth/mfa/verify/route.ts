// app/api/auth/mfa/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, method, trustDevice } = await req.json();
    const userId = session.user.id;

    let verified = false;

    if (method === "totp") {
      verified = await MFAService.verifyTOTP(userId, token);
    } else if (method === "sms") {
      verified = await MFAService.verifyCode(userId, token, "SMS");
    } else if (method === "email") {
      verified = await MFAService.verifyCode(userId, token, "EMAIL");
    } else if (method === "backup") {
      verified = await MFAService.verifyBackupCode(userId, token);
    }

    if (!verified) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Create response with MFA verification cookie
    const response = NextResponse.json({ success: true });
    
    // Set verification cookie
    response.cookies.set(`mfa_verified_${userId}`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
    });

    // If device should be trusted, set trusted device cookie
    if (trustDevice) {
      const deviceId = crypto.randomUUID();
      const deviceName = req.headers.get("user-agent") || "Unknown Device";
      
      await MFAService.addTrustedDevice(userId, deviceName, req.headers.get("x-forwarded-for") || undefined, deviceName, "browser");
      
      response.cookies.set(`mfa_device_trusted_${deviceId}`, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      response.cookies.set("mfa_device_id", deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Update session to reflect MFA verification
    await fetch(`${process.env.NEXTAUTH_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        mfaVerified: true,
        mfaVerifiedAt: Date.now(),
      }),
    });

    return response;
  } catch (error) {
    console.error("MFA verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}