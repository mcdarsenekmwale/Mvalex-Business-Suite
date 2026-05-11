import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify ticket belongs to user or user is admin
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (ticket.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        message: content.trim(),
        isAdmin,
      },
      include: {
        ticket: true,
      },
    });

    // Update ticket status if admin replies
    if (isAdmin) {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Ticket message POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
