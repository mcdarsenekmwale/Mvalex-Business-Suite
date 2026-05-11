import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import paymentService from "@/lib/payments/payment.service";
import { ensureIdempotencyKey, consumeIdempotencyKey } from "@/lib/middleware/idempotency";

const IDEMPOTENCY_HEADER = "idempotency-key";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { packageId, paymentMethod, couponCode } = body;

    const idempotencyKey = (req.headers && (req.headers as any).get?.(IDEMPOTENCY_HEADER)) || undefined;

    if (idempotencyKey) {
      const existing = await ensureIdempotencyKey(idempotencyKey, session.user.id);
      if (existing && existing.consumed && existing.responseData) {
        return NextResponse.json(existing.responseData);
      }
    }

    const result = await paymentService.purchaseCredits({ userId: session.user.id, packageId, paymentMethod, couponCode });

    if (idempotencyKey) {
      await consumeIdempotencyKey(idempotencyKey, result);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Purchase error:", error);
    return NextResponse.json({ error: error.message || "Purchase failed" }, { status: 400 });
  }
}
