import creditService from "./credit-deduction.service";

export function WithCreditDeduction(action: string, entityType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const context = this as any;
      const userId = context.getUserId?.() || args[0]?.userId || args[0];
      const idempotencyKey = `${action}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

      // Deduct credits first
      const deduction = await creditService.deductCredits({
        userId,
        action,
        entityType,
        idempotencyKey,
      }).catch((err) => {
        throw err;
      });

      try {
        const result = await originalMethod.apply(this, args);

        if (!result || result.success === false) {
          // business logic indicated failure => refund
          await creditService.refundCredits(deduction.transactionId, "Business logic failed");
          throw new Error("Business logic failed");
        }

        // Optionally attach transaction id to result
        if (result && typeof result === 'object') {
          result.creditTransactionId = deduction.transactionId;
        }

        return { result, deduction };
      } catch (error) {
        // Refund on unexpected error
        await creditService.refundCredits(deduction.transactionId, String((error as any)?.message ?? "error"));
        throw error;
      }
    };

    return descriptor;
  };
}
