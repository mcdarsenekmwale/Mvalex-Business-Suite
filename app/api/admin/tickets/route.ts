import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/permissions";
import { getTickets, getTicketMetrics, getAdminUsers } from "@/lib/admin/queries";
import { ticketFilterSchema, respondToTicketSchema } from "@/lib/admin/validators";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";

function checkAdminAuth(session: any) {
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

// GET /api/admin/tickets - List tickets with filters
export async function GET(req: Request) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const params = ticketFilterSchema.parse({
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
      dateRange: searchParams.get("dateRange") || "week",
    });

    const [ticketsResult, metrics, adminUsers] = await Promise.all([
      getTickets(params),
      getTicketMetrics(),
      getAdminUsers(),
    ]);

    return NextResponse.json({ ...ticketsResult, metrics, adminUsers });
  } catch (error) {
    console.error("Admin tickets GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST /api/admin/tickets - Respond to ticket
export async function POST(req: Request) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const { ticketId, message, status } = respondToTicketSchema.parse(body);

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        message,
        isAdmin: true,
        userId: session?.user?.id,
      },
    });

    const current = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });

    const updateData: any = {};
    if (status) updateData.status = status;
    else updateData.status = "IN_PROGRESS";

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    await TicketEventListeners.onTicketResponse(ticketId, ticketMessage.id, true);
    if (current?.status && current.status !== updateData.status) {
      await TicketEventListeners.onTicketStatusChange(ticketId, current.status, updateData.status);
    }

    return NextResponse.json(ticketMessage);
  } catch (error) {
    console.error("Admin tickets POST error:", error);
    return NextResponse.json(
      { error: "Failed to respond to ticket" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
