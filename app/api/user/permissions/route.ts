
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ROLE_PERMISSION_MAP, UserRole } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const role = (session.user as any).role || "USER";
  const permissions = (session.user as any).permissions || ROLE_PERMISSION_MAP[role as UserRole] as any[] || [];

  return NextResponse.json({ role, permissions });
}
