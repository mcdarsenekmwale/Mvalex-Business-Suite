import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CREDIT_COSTS } from "@/lib/constants";

export async function GET(req: Request, { params }: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const action = params?.action || new URL(req.url).searchParams.get("action");
    if (!action) return NextResponse.json({ error: "Action required" }, { status: 400 });

    const rule = await prisma.pricingRule.findUnique({ where: { action } as any });
    const cost = rule?.cost ?? CREDIT_COSTS[action as keyof typeof CREDIT_COSTS] ?? 0;
    return NextResponse.json({ action, cost });
  } catch (error: any) {
    console.error("Cost error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
