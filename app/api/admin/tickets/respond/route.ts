// app/api/admin/tickets/respond/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { ticketId, message, status: newStatus } = await req.json();
    
    if (!ticketId || !message) {
      return NextResponse.json(
        { error: "Ticket ID and message are required" },
        { status: 400 }
      );
    }
    
    // Create response
    const response = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: session?.user?.id,
        isAdmin: true,
        createdAt: new Date(),
        
        message,
      },
    });
    
    // Update ticket status if provided
    if (newStatus) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          ...(newStatus === "RESOLVED" && { resolvedAt: new Date() }),
        },
      });
    } else {
      // If no status provided, set to IN_PROGRESS
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }
    
    return NextResponse.json({ success: true, response });
    
  } catch (error) {
    console.error("Error responding to ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}