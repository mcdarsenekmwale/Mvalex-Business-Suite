import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, UserRole } from "@/lib/auth/permissions";
import { SessionStore } from "@/lib/session/session-store";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/sessions/[sessionId] - Admin revoke any session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;

    // Prevent admin from revoking their own session
    const currentToken =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;
    if (sessionId === currentToken) {
      return NextResponse.json(
        { error: "Cannot revoke your own session" },
        { status: 400 }
      );
    }

    const dbSession = await prisma.session.findUnique({
      where: { sessionToken: sessionId },
      select: { userId: true },
    });

    if (!dbSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    await SessionStore.revokeSession(sessionId, dbSession.userId);

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
