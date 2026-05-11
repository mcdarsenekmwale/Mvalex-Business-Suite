import { NextResponse } from "next/server";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await TicketEventListeners.scheduleEscalationScan(4);
    return NextResponse.json({ success: true, escalated: count });
  } catch (error) {
    console.error("Escalation cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
