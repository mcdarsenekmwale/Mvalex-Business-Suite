import { NextResponse } from "next/server";
import { NotificationQueueService } from "@/lib/notifications/notification-queue.service";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await NotificationQueueService.processDue(100);
    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("Notification retry cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
