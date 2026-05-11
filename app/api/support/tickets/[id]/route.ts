// app/api/support/tickets/[id]/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function to check if user has access to ticket
async function hasAccessToTicket(userId: string, ticketId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    const isAdmin = user?.roles.some(
      r => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
    );
    
    const isSupportAgent = user?.roles.some(r => r.role.name === "SUPPORT_AGENT");
    
    if (isAdmin) return true;
    
    if (isSupportAgent) {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { assignedTo: true },
      });
      return ticket?.assignedTo === userId;
    }
    
    // Regular users can only see their own tickets
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { userId: true },
    });
    
    return ticket?.userId === userId;
  } catch (error) {
    console.error("Error checking ticket access:", error);
    return false;
  }
}

// GET: Fetch single ticket details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketId = params.id;
    const userId = session.user.id;
    
    // Check access
    const hasAccess = await hasAccessToTicket(userId, ticketId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden - Access denied" }, { status: 403 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        messages: {
          include: {
            ticket: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
    
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update ticket status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketId = params.id;
    const userId = session.user.id;
    
    // Check if user is admin or support agent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    const isAdmin = user?.roles.some(
      r => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
    );
    
    const isSupportAgent = user?.roles.some(r => r.role.name === "SUPPORT_AGENT");
    
    if (!isAdmin && !isSupportAgent) {
      return NextResponse.json({ error: "Forbidden - Requires admin or support role" }, { status: 403 });
    }

    const body = await req.json();
    const { status, assignedTo } = body;

    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }
    
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo || null;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, ticket });
    
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a ticket (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketId = params.id;
    const userId = session.user.id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    const isAdmin = user?.roles.some(
      r => r.role.name === "ADMIN" || r.role.name === "SUPER_ADMIN"
    );
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Delete ticket and all associated responses
    await prisma.$transaction([
      prisma.ticketMessage.deleteMany({
        where: { ticketId },
      }),
      prisma.supportTicket.delete({
        where: { id: ticketId },
      }),
    ]);

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}