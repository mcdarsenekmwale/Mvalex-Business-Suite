import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await MFAService.getStats();
    return NextResponse.json({
      totalEnrolled: stats.totalEnrolled,
      totalUsers: stats.totalUsers,
      adoptionRate: stats.adoptionRate,
      enrolledAdmins: stats.enrolledAdmins,
      verifiedToday: stats.verifiedToday,
      activeDevices: stats.activeDevices,
      pendingSetup: stats.pendingSetup,
      byMethod: stats.byMethod,
    });
  } catch (error) {
    console.error("Error fetching MFA stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
