import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import rewardService from "@/lib/credits/reward.service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    if (!action) return NextResponse.json({ error: "Action required" }, { status: 400 });

    const res = await rewardService.checkAndAwardRewards(session.user.id, action);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("Reward error:", error);
    return NextResponse.json({ error: error.message || "Reward failed" }, { status: 500 });
  }
}
