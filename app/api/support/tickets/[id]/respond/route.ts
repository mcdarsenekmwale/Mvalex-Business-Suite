// app/api/support/tickets/[id]/respond/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";

export async function POST(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {id: ticketId} = await (params as any).params;

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const userId = session.user.id;
    const { message, status , attachments =[]} = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if user is admin or support agent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    const isStaff = user?.roles.some(
      r => r.role.name === "ADMIN" || 
           r.role.name === "SUPER_ADMIN" || 
           r.role.name === "SUPPORT_AGENT"
    );
    
    if (!isStaff) {
      return NextResponse.json({ error: "Forbidden - Staff access required" }, { status: 403 });
    }

    // Create response
    const response = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: userId,
        isAdmin: true,
        message: message.trim(),
        attachments: attachments,
       
      },
    });

    // Update ticket status if provided
    let updatedTicket;
    if (status) {
      const before = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { 
          status,
          ...(status === "RESOLVED" && { resolvedAt: new Date() }),
        },
      });
      if (before?.status && before.status !== status) {
        await TicketEventListeners.onTicketStatusChange(ticketId, before.status, status);
      }
    } else {
      // Update to IN_PROGRESS if not already
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      
      if (ticket?.status === "OPEN") {
        updatedTicket = await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: "IN_PROGRESS" },
        });
      }
    }

    await TicketEventListeners.onTicketResponse(ticketId, response.id, true);

    return NextResponse.json({ 
      success: true, 
      response,
      ticket: updatedTicket,
    });
    
  } catch (error) {
    console.error("Error responding to ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}