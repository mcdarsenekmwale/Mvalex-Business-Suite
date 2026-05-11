import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import couponService from "@/lib/credits/coupon.service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, transactionId } = await req.json();
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const validation = await couponService.validateCoupon(code, session.user.id);
    if (!validation.valid) return NextResponse.json({ error: validation.message }, { status: 400 });

    await couponService.applyCoupon(validation.coupon.id, session.user.id, transactionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Coupon apply error:", error);
    return NextResponse.json({ error: error.message || "Apply failed" }, { status: 500 });
  }
}
