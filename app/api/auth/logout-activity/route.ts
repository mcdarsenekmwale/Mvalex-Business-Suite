import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

export async function POST() {
  try {
    const session = await auth();
    if (session?.user?.id) {
      ActivityLogger.log({
        userId: session.user.id,
        action: "LOGOUT",
        actionType: "LOGOUT",
        entityType: "USER",
        description: "Logged out",
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout activity logging error:", error);
    return NextResponse.json({ error: "Failed to log logout" }, { status: 500 });
  }
}
