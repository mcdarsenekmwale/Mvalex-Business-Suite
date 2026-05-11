import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, UserRole } from "@/lib/auth/permissions";
import { SessionStore } from "@/lib/session/session-store";
import { prisma } from "@/lib/prisma";

// GET /api/admin/sessions - Admin view of all sessions
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (statusFilter === "active") {
      where.expires = { gt: new Date() };
    } else if (statusFilter === "expired") {
      where.expires = { lt: new Date() };
    }
    if (userId) {
      where.userId = userId;
    }

    const [dbSessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { expires: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.session.count({ where }),
    ]);

    const enhancedSessions = await Promise.all(
      dbSessions.map(async (dbSession) => {
        const meta = await SessionStore.getSessionMetadata(
          dbSession.sessionToken
        );
        const isActive = dbSession.expires > new Date();

        return {
          id: dbSession.sessionToken,
          user: dbSession.user,
          deviceType: meta?.deviceType || "unknown",
          browser: meta?.browser || "Unknown",
          os: meta?.os || "Unknown",
          ipAddress: meta?.ipAddress || "Unknown",
          createdAt: dbSession.expires.toISOString(),
          lastActivityAt: meta?.lastActivityAt || dbSession.expires.toISOString(),
          expiresAt: dbSession.expires.toISOString(),
          status: isActive ? "active" : "expired",
        };
      })
    );

    return NextResponse.json({
      sessions: enhancedSessions,
      pagination: {
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
