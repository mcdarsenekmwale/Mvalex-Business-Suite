import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MFAService } from "@/lib/mfa/mfa.service";
import { MFAMethod } from "@/generated/prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, token, deviceName, phoneNumber, code } = body;

    if (action === "generateTOTPSecret") {
      const result = await MFAService.generateTOTPSecret(
        session.user.id,
        session.user.email || ""
      );
      return NextResponse.json({
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.rawBackupCodes,
      });
    }

    if (action === "verifyAndEnableTOTP") {
      if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
      }
      const ip = req.headers.get("x-forwarded-for") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;
      const success = await MFAService.verifyAndEnableTOTP(
        session.user.id,
        token,
        deviceName,
        ip,
        userAgent
      );
      if (!success) {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "TOTP enabled successfully" });
    }

    if (action === "sendSmsCode") {
      await MFAService.sendSMSCode(session.user.id, phoneNumber);
      return NextResponse.json({ success: true, message: "SMS code sent" });
    }

    if (action === "verifySmsCode") {
      if (!code) {
        return NextResponse.json({ error: "Code required" }, { status: 400 });
      }
      const valid = await MFAService.verifyCode(session.user.id, code, "SMS" as any);
      if (!valid) {
        return NextResponse.json({ error: "Invalid SMS code" }, { status: 400 });
      }
      await prisma.userMFA.update({
        where: { userId: session.user.id },
        data: { enabled: true, preferredMethod: MFAMethod.SMS, phoneVerified: true },
      });
      return NextResponse.json({ success: true, message: "SMS MFA enabled" });
    }

    if (action === "sendEmailCode") {
      await MFAService.sendEmailCode(session.user.id);
      return NextResponse.json({ success: true, message: "Email code sent" });
    }

    if (action === "verifyEmailCode") {
      if (!code) {
        return NextResponse.json({ error: "Code required" }, { status: 400 });
      }
      const valid = await MFAService.verifyCode(session.user.id, code, "EMAIL" as any);
      if (!valid) {
        return NextResponse.json({ error: "Invalid email code" }, { status: 400 });
      }
      await prisma.userMFA.update({
        where: { userId: session.user.id },
        data: { enabled: true, preferredMethod: MFAMethod.EMAIL, emailVerified: true },
      });
      return NextResponse.json({ success: true, message: "Email MFA enabled" });
    }

    if (action === "disableMFA") {
      await MFAService.disableMFA(session.user.id, "User requested disable");
      return NextResponse.json({ success: true, message: "MFA disabled" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in MFA setup:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
