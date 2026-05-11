import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";
import { MFAMethod } from "@/generated/prisma/client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { method, code, token, deviceName, trustDevice } = body;
    const verificationCode = code || token;

    let valid = false;

    if (method === "TOTP" || method === "totp") {
      valid = await MFAService.verifyTOTP(session.user.id, verificationCode);
    } else if (method === "SMS" || method === "sms") {
      valid = await MFAService.verifyCode(session.user.id, verificationCode, "SMS" as any);
    } else if (method === "EMAIL" || method === "email") {
      valid = await MFAService.verifyCode(session.user.id, verificationCode, "EMAIL" as any);
    } else if (method === "BACKUP" || method === "backup") {
      valid = await MFAService.verifyBackupCode(session.user.id, verificationCode);
    } else {
      return NextResponse.json({ error: "Invalid verification method" }, { status: 400 });
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Set MFA verified cookie
    const cookieStore = await cookies();
    cookieStore.set(`mfa_verified_${session.user.id}`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours default
      path: "/",
    });

    // Add trusted device if requested
    if (trustDevice && deviceName) {
      const ip = req.headers.get("x-forwarded-for") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;
      const deviceId = await MFAService.addTrustedDevice(
        session.user.id,
        deviceName,
        ip,
        userAgent
      );
      cookieStore.set("mfa_device_id", deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error verifying MFA:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
