import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { AgentAvailabilityService } from "@/lib/agents/agent-availability.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await AgentAvailabilityService.getAgentDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin agent dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
