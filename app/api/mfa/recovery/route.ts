import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Recovery code is required" }, { status: 400 });
    }

    const valid = await MFAService.verifyBackupCode(session.user.id, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Recovery code accepted. Please set up MFA again.",
    });
  } catch (error) {
    console.error("Error processing MFA recovery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
