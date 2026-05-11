import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import couponService from "@/lib/credits/coupon.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

export const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", credits: 100, price: 999, currency: "USD", bonusCredits: 0 },
  { id: "basic", name: "Basic", credits: 250, price: 1999, currency: "USD", bonusCredits: 25 },
  { id: "pro", name: "Professional", credits: 500, price: 3999, currency: "USD", bonusCredits: 75 },
];

export function getCreditPackages() {
  return CREDIT_PACKAGES.map((pkg) => ({
    ...pkg,
    priceFormatted: `$${(pkg.price / 100).toFixed(2)}`,
  }));
}

export function getPackageById(packageId: string) {
  return CREDIT_PACKAGES.find((p) => p.id === packageId) || null;
}

interface PurchaseRequest {
  userId: string;
  packageId: string;
  paymentMethod: "stripe" | "paypal" | "crypto";
  couponCode?: string;
}

class PaymentService {
  async purchaseCredits(req: PurchaseRequest) {
    const pkg = getPackageById(req.packageId);
    if (!pkg) throw new Error("Package not found");

    let finalPrice = pkg.price;
    let coupon: any = null;
    if (req.couponCode) {
      const validation = await couponService.validateCoupon(req.couponCode, req.userId, pkg.price);
      if (!validation.valid) throw new Error(validation.message);
      coupon = validation.coupon;
      finalPrice = Math.max(0, pkg.price - (validation.discountAmount ?? 0));
    }

    // Create pending purchase record
    const purchase = await prisma.creditTransaction.create({
      data: {
        userId: req.userId,
        amount: pkg.credits + (pkg.bonusCredits ?? 0),
        type: "CREDIT_PURCHASE",
        description: `Purchase ${pkg.name}`,
        balanceAfter: 0,
        metadata: { packageId: pkg.id, price: pkg.price, finalPrice, couponCode: req.couponCode, status: "PENDING" },
      },
    });

    return { success: true, package: pkg, finalPrice, purchaseId: purchase.id, coupon };
  }

  async applyCreditsAfterPayment(userId: string, packageId: string, purchaseRecordId: string, couponCode?: string) {
    const pkg = getPackageById(packageId);
    if (!pkg) throw new Error("Package not found");

    let balanceBefore = 0;
    let balanceAfter = 0;
    const totalCredits = pkg.credits + (pkg.bonusCredits ?? 0);

    await prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw(Prisma.sql`SELECT id, credits_balance FROM users WHERE id = ${userId} FOR UPDATE`) as Array<{ id: string; credits_balance: number }>;
      balanceBefore = Number(users[0]?.credits_balance ?? 0);
      balanceAfter = balanceBefore + totalCredits;

      await tx.user.update({ where: { id: userId }, data: { creditsBalance: balanceAfter } });

      await tx.creditTransaction.update({
        where: { id: purchaseRecordId },
        data: { balanceAfter, metadata: { packageId: pkg.id, credits: pkg.credits, bonusCredits: pkg.bonusCredits, status: "COMPLETED" } },
      });

      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
        if (coupon) {
          await tx.couponRedemption.create({
            data: { couponId: coupon.id, userId, transactionId: purchaseRecordId },
          });
        }
      }
    }, { timeout: 30000 });

    // Log purchase activity asynchronously
    ActivityLogger.logWithCredits(
      userId,
      "CREDIT_PURCHASE",
      "PURCHASE",
      "CREDIT_PACKAGE",
      purchaseRecordId,
      0,
      balanceBefore,
      balanceAfter,
      { packageId: packageId, packageName: pkg.name, credits: totalCredits }
    );

    return { success: true };
  }

  async handleWebhook(provider: string, payload: any) {
    // Delegated to route-specific webhook handlers
    return { received: true, provider };
  }
}

export default new PaymentService();
