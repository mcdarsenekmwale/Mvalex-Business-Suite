import prisma from "@/lib/prisma";

export async function ensureIdempotencyKey(key?: string, userId?: string) {
  if (!key) return null;
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (existing) return existing;
  return prisma.idempotencyKey.create({ data: { key, userId } });
}

export async function consumeIdempotencyKey(key: string, responseData: any) {
  return prisma.idempotencyKey.update({ where: { key }, data: { consumed: true, responseData } });
}
