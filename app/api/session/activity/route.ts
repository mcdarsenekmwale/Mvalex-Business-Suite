import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SessionStore } from "@/lib/session/session-store";
import { parseDeviceInfo } from "@/lib/session/session-tracker";

/**
 * POST /api/session/activity
 * Lightweight endpoint for the frontend to report session activity.
 * Reads session token from cookies and user-agent/ip from headers.
 * Creates or updates session metadata in Redis.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "No session token" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || "";
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const deviceInfo = parseDeviceInfo(userAgent);

    // Upsert session metadata
    await SessionStore.storeSessionMetadata(
      sessionToken,
      session.user.id,
      {
        userAgent,
        ipAddress,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "active",
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session activity tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
