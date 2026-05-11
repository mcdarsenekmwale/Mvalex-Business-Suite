import { NextResponse } from "next/server";
import { CreditEventListeners } from "@/lib/listeners/credit-listeners";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await CreditEventListeners.notifyExpiringCredits(7);
    return NextResponse.json({ success: true, notified: count });
  } catch (error) {
    console.error("Expiring credit cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
