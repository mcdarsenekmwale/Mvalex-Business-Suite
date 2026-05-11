import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SessionStore } from "@/lib/session/session-store";
import { prisma } from "@/lib/prisma";

function getSessionToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value
  );
}

// GET /api/user/sessions - Get all active sessions for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentSessionToken = getSessionToken(req);
    const sessions = await SessionStore.getUserSessions(session.user.id);

    // Get database sessions for creation/expiration info
    const dbSessions = await prisma.session.findMany({
      where: { userId: session.user.id },
      select: { sessionToken: true, expires: true },
    });
    const dbSessionMap = new Map(dbSessions.map((s) => [s.sessionToken, s]));

    const formattedSessions = sessions.map((s) => {
      const dbSession = dbSessionMap.get(s.sessionToken);
      const isCurrent = s.sessionToken === currentSessionToken;

      return {
        id: s.sessionToken,
        deviceType: s.deviceType,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        lastActivityAt: s.lastActivityAt,
        createdAt: dbSession?.expires?.toISOString() || s.lastActivityAt,
        expiresAt: dbSession?.expires?.toISOString() || s.expiresAt,
        isCurrent,
        status: s.status,
      };
    });

    // Sort: current first, then by last activity
    formattedSessions.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return (
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime()
      );
    });

    return NextResponse.json({
      sessions: formattedSessions,
      total: formattedSessions.length,
      currentSessionId: currentSessionToken,
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/sessions - Revoke all other sessions
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentSessionToken = getSessionToken(req);
    if (!currentSessionToken) {
      return NextResponse.json(
        { error: "No session token found" },
        { status: 400 }
      );
    }

    const revokedCount = await SessionStore.revokeOtherSessions(
      session.user.id,
      currentSessionToken
    );

    return NextResponse.json({
      success: true,
      message: `Revoked ${revokedCount} other session${revokedCount !== 1 ? "s" : ""}`,
      revokedCount,
    });
  } catch (error) {
    console.error("Error revoking sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
