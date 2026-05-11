import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SessionStore } from "@/lib/session/session-store";

function getSessionToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value
  );
}

// DELETE /api/user/sessions/[sessionId] - Revoke a specific session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const currentSessionToken = getSessionToken(req);

    // Prevent revoking current session
    if (sessionId === currentSessionToken) {
      return NextResponse.json(
        { error: "Cannot revoke your current session" },
        { status: 400 }
      );
    }

    const revoked = await SessionStore.revokeSession(
      sessionId,
      session.user.id
    );

    if (!revoked) {
      return NextResponse.json(
        { error: "Session not found or already revoked" },
        { status: 404 }
      );
    }

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
