import { NextResponse } from "next/server";
import paymentService from "@/lib/payments/payment.service";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    // In production validate PayPal webhook signature
    await paymentService.handleWebhook("paypal", payload);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json({ error: error.message || "Webhook failed" }, { status: 400 });
  }
}
