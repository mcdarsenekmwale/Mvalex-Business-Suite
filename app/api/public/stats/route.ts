import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [userCount, businessCardCount, invoiceCount, logoCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.businessCard.count().catch(() => 0),
      prisma.invoice.count().catch(() => 0),
      prisma.logo.count().catch(() => 0),
    ]);

    return NextResponse.json({
      userCount,
      businessCardCount,
      invoiceCount,
      logoCount,
    });
  } catch (error) {
    console.error("Public stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
