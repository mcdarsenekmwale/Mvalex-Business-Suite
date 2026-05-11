import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { AgentAvailabilityService, type AgentStatus } from "@/lib/agents/agent-availability.service";

const ALLOWED: AgentStatus[] = ["ONLINE", "BUSY", "AWAY", "OFFLINE", "IN_MEETING", "ON_BREAK", "TRAINING"];

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { agentId, status, reason } = body as { agentId?: string; status?: AgentStatus; reason?: string };
    if (!agentId || !status || !ALLOWED.includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await AgentAvailabilityService.updateStatus(agentId, status, reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin agent status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
