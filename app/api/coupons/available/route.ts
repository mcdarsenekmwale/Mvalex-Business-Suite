import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const coupons = await prisma.coupon.findMany({ where: { isActive: true, validFrom: { lte: now }, validUntil: { gte: now } } });
    return NextResponse.json({ coupons });
  } catch (error: any) {
    console.error("Coupons available error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
