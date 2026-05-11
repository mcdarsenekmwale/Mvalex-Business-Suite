// Concurrency test: attempts multiple parallel deductions to validate locking/idempotency

import prisma from "../../lib/prisma";
import creditService from "../../lib/credits/credit-deduction.service";

async function run() {
  console.log('Starting concurrency test');
  try {
    // Create a test user with limited credits
    const user = await prisma.user.create({ data: { email: `conc-${Date.now()}@example.com`, creditsBalance: 50 } });
    console.log('Test user:', user.id, 'balance:', user.creditsBalance);

    // Attempt 10 parallel deductions of cost 5 (simulate same action)
    const attempts = Array.from({ length: 10 }).map((_, i) => {
      return creditService.deductCredits({ userId: user.id, action: 'GENERATE_LOGO', idempotencyKey: `concurrent-${i}-${Date.now()}` })
        .then(r => ({ ok: true, r }))
        .catch(e => ({ ok: false, e: String(e) }));
    });

    const results = await Promise.all(attempts);
    console.log('Results:', results);

    const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
    console.log('Final balance:', finalUser?.creditsBalance);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Cleanup done');
  } catch (err) {
    console.error('Concurrency test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
