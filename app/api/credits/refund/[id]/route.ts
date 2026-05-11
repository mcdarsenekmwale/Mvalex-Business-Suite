import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import creditService from "@/lib/credits/credit-deduction.service";

export async function POST(req: Request, { params }: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const txId = params?.id;
    if (!txId) return NextResponse.json({ error: "Transaction id required" }, { status: 400 });

    await creditService.refundCredits(txId, `Refund requested by user ${session.user.id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: error.message || "Refund failed" }, { status: 400 });
  }
}
