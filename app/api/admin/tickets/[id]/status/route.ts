// app/api/admin/tickets/[id]/status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { status } = await req.json();
    const ticketId = params.id;
    
    const current = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(status === "RESOLVED" && { resolvedAt: new Date() }),
      },
    });

    if (current?.status && current.status !== status) {
      await TicketEventListeners.onTicketStatusChange(ticketId, current.status, status);
    }
    
    return NextResponse.json({ success: true, ticket });
    
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}