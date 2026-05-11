import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import couponService from "@/lib/credits/coupon.service";

export async function GET(req: Request, { params }: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const code = url.searchParams.get("code") || params?.code;
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const validation = await couponService.validateCoupon(code, session.user.id, undefined);
    return NextResponse.json(validation);
  } catch (error: any) {
    console.error("Coupon validate error:", error);
    return NextResponse.json({ error: error.message || "Validation failed" }, { status: 400 });
  }
}
