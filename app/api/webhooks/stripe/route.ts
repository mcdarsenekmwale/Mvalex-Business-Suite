import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import paymentService from "@/lib/payments/payment.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const userId = metadata.userId;
        const packageId = metadata.packageId;
        const purchaseRecordId = metadata.purchaseRecordId;
        const couponCode = metadata.couponCode;

        if (!userId || !packageId || !purchaseRecordId) {
          console.error("Missing metadata in checkout session:", metadata);
          break;
        }

        if (session.payment_status === "paid") {
          await paymentService.applyCreditsAfterPayment(
            userId,
            packageId,
            purchaseRecordId,
            couponCode || undefined
          );
          console.log(`Credits applied for user ${userId}, package ${packageId}`);
        }
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
        const metadata = (session as any).metadata || {};
        const purchaseRecordId = metadata.purchaseRecordId;

        if (purchaseRecordId) {
          // Mark purchase as failed
          const { prisma } = await import("@/lib/prisma");
          const existingTx = await prisma.creditTransaction.findUnique({ where: { id: purchaseRecordId } });
          const existingMetadata = (existingTx?.metadata as Record<string, any>) || {};
          await prisma.creditTransaction.update({
            where: { id: purchaseRecordId },
            data: {
              metadata: {
                ...existingMetadata,
                status: "FAILED",
                failureReason: event.type,
              },
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
