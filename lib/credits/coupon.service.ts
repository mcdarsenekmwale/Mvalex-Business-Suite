import prisma from "@/lib/prisma";

interface CouponValidation {
  valid: boolean;
  coupon?: any;
  discountAmount?: number;
  message?: string;
}

class CouponService {
  async validateCoupon(code: string, userId: string, purchaseAmount?: number): Promise<CouponValidation> {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) return { valid: false, message: "Coupon not found" };
    if (!coupon.isActive) return { valid: false, message: "Coupon inactive" };
    const now = new Date();
    if (coupon.validFrom > now || coupon.validUntil < now) return { valid: false, message: "Coupon not in valid date range" };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { valid: false, message: "Coupon usage limit reached" };

    const userUses = await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (coupon.perUserLimit && userUses >= coupon.perUserLimit) return { valid: false, message: "Per-user coupon limit reached" };

    if (coupon.minPurchase && purchaseAmount && purchaseAmount < coupon.minPurchase) return { valid: false, message: "Minimum purchase not met" };

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (purchaseAmount ?? 0) * (coupon.discountValue / 100);
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else if (coupon.discountType === "FIXED") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "FREE_CREDITS") {
      discountAmount = 0;
    }

    return { valid: true, coupon, discountAmount };
  }

  async applyCoupon(couponId: string, userId: string, transactionId?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.couponRedemption.create({ data: { couponId, userId, transactionId } });
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    });
  }

  async generateCoupon(data: { code?: string; description?: string; discountType: string; discountValue: number; validFrom: Date; validUntil: Date; usageLimit?: number; perUserLimit?: number; applicableActions?: string[] }) {
    const code = data.code ?? `CPN-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    const coupon = await prisma.coupon.create({ data: {
      code,
      description: data.description,
      discountType: data.discountType as any,
      discountValue: data.discountValue,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      usageLimit: data.usageLimit,
      perUserLimit: data.perUserLimit ?? 1,
      applicableActions: data.applicableActions ?? [],
    } });
    return coupon;
  }
}

export default new CouponService();
