// Route to fetch user credit balance
// Requires authentication

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedBalance, setCachedBalance } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try cache first
    let balance = await getCachedBalance(session.user.id);
    let cacheHit = balance !== null;

    if (balance === null) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { creditsBalance: true },
      });
      balance = user?.creditsBalance || 0;
      await setCachedBalance(session.user.id, balance);
    }

    return NextResponse.json({
      balance,
      cacheHit,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}