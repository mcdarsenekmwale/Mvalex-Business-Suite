// Idempotency test: reusing the same idempotency key should return cached response

import prisma from "../../lib/prisma";
import creditService from "../../lib/credits/credit-deduction.service";

async function run() {
  console.log('Starting idempotency test');
  try {
    const user = await prisma.user.create({ data: { email: `idem-${Date.now()}@example.com`, creditsBalance: 100 } });
    const key = `idem-key-${Date.now()}`;

    // First call
    const first = await creditService.deductCredits({ userId: user.id, action: 'GENERATE_LOGO', idempotencyKey: key });
    console.log('First deduction:', first);

    // Second call with same key should return same response (no double deduction)
    const second = await creditService.deductCredits({ userId: user.id, action: 'GENERATE_LOGO', idempotencyKey: key });
    console.log('Second deduction (should be idempotent):', second);

    // Check balance
    const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
    console.log('Final balance:', finalUser?.creditsBalance);

    await prisma.user.delete({ where: { id: user.id } });
  } catch (err) {
    console.error('Idempotency test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
