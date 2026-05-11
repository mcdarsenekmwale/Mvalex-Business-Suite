import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AgentAvailabilityService, type AgentStatus } from "@/lib/agents/agent-availability.service";

const ALLOWED: AgentStatus[] = ["ONLINE", "BUSY", "AWAY", "OFFLINE", "IN_MEETING", "ON_BREAK", "TRAINING"];

// Get agent status
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = await AgentAvailabilityService.getAgentStatus(session.user.id);
    return NextResponse.json({ 
      status: status || "ONLINE"
    });
  } catch (error) {
    console.error("Agent status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update agent status
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status, reason } = (await req.json()) as { status?: AgentStatus; reason?: string };
    if (!status || !ALLOWED.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await AgentAvailabilityService.updateStatus(session.user.id, status, reason, session.user.name as string);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent self status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
