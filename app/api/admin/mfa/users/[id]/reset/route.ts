import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { MFAService } from "@/lib/mfa/mfa.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await MFAService.resetMFA(id);

    await ActivityLogger.log({
      userId: session.user.id,
      action: "MFA_ADMIN_RESET",
      actionType: "UPDATE",
      entityType: "USER",
      entityId: id,
      description: "Admin reset MFA for user",
    });

    return NextResponse.json({ success: true, message: "MFA reset successfully" });
  } catch (error) {
    console.error("Error resetting MFA:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
