import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import paymentService from "@/lib/payments/payment.service";
import { getPackageById } from "@/lib/payments/payment.service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

const CREDIT_PACKAGES = {
  starter: { credits: 100, price: 9.99, name: "Starter Pack", bonusCredits: 0, currency: "usd" },
  basic: { credits: 250, price: 19.99, name: "Basic Pack", bonusCredits: 25, currency: "usd" },
  pro: { credits: 500, price: 39.99, name: "Pro Pack", bonusCredits: 75, currency: "usd" },
  business: { credits: 1200, price: 89.99, name: "Business Pack", bonusCredits: 200, currency: "usd" },
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageId, couponCode } = await req.json();

    // Validate package
    const creditPackage = getPackageById(packageId) || CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
    if (!creditPackage) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    // Create pending purchase record
    const purchase = await paymentService.purchaseCredits({
      userId: session.user.id,
      packageId,
      paymentMethod: "stripe",
      couponCode,
    });

    const totalCredits = creditPackage.credits + (creditPackage.bonusCredits ?? 0);

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: creditPackage.currency.toLowerCase(),
            product_data: {
              name: `${creditPackage.name} - ${totalCredits} Credits`,
              description: creditPackage.bonusCredits
                ? `Includes ${creditPackage.credits} credits + ${creditPackage.bonusCredits} bonus credits`
                : `${creditPackage.credits} credits`,
            },
            unit_amount: purchase.finalPrice,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.APP_URL || "http://localhost:5001"}/settings?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "http://localhost:5001"}/settings?purchase=cancelled`,
      metadata: {
        userId: session.user.id,
        packageId: (creditPackage as any).id || packageId,
        purchaseRecordId: purchase.purchaseId,
        credits: String(totalCredits),
        couponCode: couponCode || "",
      },
      client_reference_id: purchase.purchaseId,
    });

    return NextResponse.json({
      success: true,
      sessionUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
