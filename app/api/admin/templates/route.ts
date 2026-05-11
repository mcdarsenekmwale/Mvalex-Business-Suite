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
    const [
      cardTemplates,
      invoiceTemplates,
      emailTemplates,
    ] = await Promise.all([
      prisma.businessCardTemplate.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.invoiceTemplate.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ 
      cardTemplates, 
      invoiceTemplates, 
      emailTemplates,
    });
  } catch (error) {
    console.error("Templates GET error:", error);
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
    const { name, category, frontConfig, backConfig } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const created = await prisma.businessCardTemplate.create({
      data: { name, category: category || "MODERN", frontConfig: frontConfig || null, backConfig: backConfig || null },
    });

    return NextResponse.json({ template: created }, { status: 201 });
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

