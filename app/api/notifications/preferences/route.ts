import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await prisma.$queryRaw<
      Array<{ id: string; type: string; channel: string; enabled: boolean }>
    >`SELECT "id", "type", "channel", "enabled" FROM "NotificationPreference" WHERE "userId" = ${session.user.id}`;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Preference GET error:", error);
    return NextResponse.json({ preferences: [] });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates = Array.isArray(body?.preferences) ? body.preferences : [];

    for (const pref of updates) {
      const type = String(pref.type || "");
      const channel = String(pref.channel || "");
      const enabled = Boolean(pref.enabled);
      if (!type || !channel) continue;

      await prisma.$executeRaw`
        INSERT INTO "NotificationPreference" ("id", "userId", "type", "channel", "enabled", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${session.user.id}, ${type as any}, ${channel as any}, ${enabled}, NOW(), NOW())
        ON CONFLICT ("userId", "type", "channel")
        DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW()
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Preference PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
