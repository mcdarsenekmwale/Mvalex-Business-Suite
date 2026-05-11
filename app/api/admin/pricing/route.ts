import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rules = await prisma.pricingRule.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: rules });
  } catch (error) {
    console.error("Pricing GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, cost, description, isActive = true } = body;
    if (!action || typeof cost !== "number") return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const existing = await prisma.pricingRule.findUnique({ where: { action } });
    if (existing) {
      const updated = await prisma.pricingRule.update({ where: { action }, data: { cost, description, isActive } });
      return NextResponse.json({ rule: updated });
    }

    const created = await prisma.pricingRule.create({ data: { action, cost, description, isActive } });
    return NextResponse.json({ rule: created }, { status: 201 });
  } catch (error) {
    console.error("Pricing POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

