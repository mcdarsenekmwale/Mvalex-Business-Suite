import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await MFAService.getMFAStatus(session.user.id);
    return NextResponse.json({
      hasBackupCodes: status.hasBackupCodes,
      remainingCodes: status.hasBackupCodes ? "unknown" : 0,
    });
  } catch (error) {
    console.error("Error fetching backup codes status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();

    if (action === "regenerate") {
      const codes = await MFAService.regenerateBackupCodes(session.user.id);
      return NextResponse.json({ success: true, codes });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing backup codes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
