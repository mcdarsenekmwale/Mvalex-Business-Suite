// app/api/support/tickets/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";

// Helper function to get user session
async function getSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

// Helper function to check if user is support staff
async function isSupportStaff(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: { role: true },
        },
      },
    });
    
    if (!user) return false;
    
    return user.roles.some(
      r => r.role.name === "ADMIN" || 
           r.role.name === "SUPER_ADMIN" || 
           r.role.name === "SUPPORT_AGENT"
    );
  } catch (error) {
    console.error("Error checking support staff:", error);
    return false;
  }
}

// GET: Fetch support tickets with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isStaff = await isSupportStaff(userId);
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const assigned = searchParams.get("assigned"); // "true" for tickets assigned to current user
    const myTickets = searchParams.get("myTickets"); // "true" for user's own tickets
    
    const skip = (page - 1) * limit;
    
    // Build where clause based on user role
    let where: any = {};
    
    // Regular users can only see their own tickets
    if (!isStaff) {
      where.userId = userId;
    } else {
      // Staff can filter by assigned status
      if (assigned === "true") {
        where.assignedTo = userId;
      }
      if (myTickets === "true") {
        where.userId = userId;
      }
    }
    
    // Apply filters
    if (status && status !== "all") {
      where.status = status;
    }
    
    if (priority && priority !== "all") {
      where.priority = priority;
    }
    
    if (category && category !== "all") {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // Fetch tickets with pagination
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
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
            orderBy: { createdAt: "asc" },
            take: 8,
            select: {
              id: true,
              message: true,
              isAdmin: true,
              createdAt: true,
              userId: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: [
          { priority: "asc" }, // URGENT, HIGH, MEDIUM, LOW
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);
    
    // Get available categories for filtering
    const categories = await prisma.supportTicket.groupBy({
      by: ["category"],
      _count: { category: true },
    });
    
    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        categories: categories.map(c => ({
          name: c.category || "Uncategorized",
          count: c._count.category,
        })),
      },
    });
    
  } catch (error) {
    console.error("Support ticket GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a new support ticket
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    
    const { subject, description, category, priority, attachments } = body;
    
    // Validate required fields
    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }
    
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }
    
    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject: subject.trim(),
        description: description.trim(),
        category: category || "general",
        priority: priority || "MEDIUM",
        status: "OPEN",
        
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        action: "CREATE_TICKET",
        actionType: "CREATE",
        entityType: "TICKET",
        entityId: ticket.id,
        description: `Created support ticket: ${subject}`,
      },
    });

    await TicketEventListeners.onTicketCreated(ticket.id);
    
    return NextResponse.json({
      success: true,
      ticket,
    }, { status: 201 });
    
  } catch (error) {
    console.error("Support ticket POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT: Bulk update tickets (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const isStaff = await isSupportStaff(session.user.id);
    if (!isStaff) {
      return NextResponse.json({ error: "Forbidden - Staff access required" }, { status: 403 });
    }
    
    const body = await req.json();
    const { ticketIds, status, priority, assignedTo } = body;
    
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: "Ticket IDs are required" },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }
    
    // Bulk update tickets
    const result = await prisma.supportTicket.updateMany({
      where: {
        id: { in: ticketIds },
      },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
    
  } catch (error) {
    console.error("Support ticket PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Bulk delete tickets (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const isStaff = await isSupportStaff(session.user.id);
    if (!isStaff) {
      return NextResponse.json({ error: "Forbidden - Staff access required" }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("id");
    const bulk = searchParams.get("bulk") === "true";
    
    if (bulk) {
      // Bulk delete
      const body = await req.json();
      const { ticketIds } = body;
      
      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return NextResponse.json(
          { error: "Ticket IDs are required" },
          { status: 400 }
        );
      }
      
      // Delete all responses first
      await prisma.ticketMessage.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      
      // Delete tickets
      const result = await prisma.supportTicket.deleteMany({
        where: { id: { in: ticketIds } },
      });
      
      return NextResponse.json({
        success: true,
        deletedCount: result.count,
      });
    } else {
      // Single delete
      if (!ticketId) {
        return NextResponse.json(
          { error: "Ticket ID is required" },
          { status: 400 }
        );
      }
      
      // Delete responses first
      await prisma.ticketMessage.deleteMany({
        where: { ticketId },
      });
      
      // Delete ticket
      await prisma.supportTicket.delete({
        where: { id: ticketId },
      });
      
      return NextResponse.json({
        success: true,
        deleted: true,
      });
    }
    
  } catch (error) {
    console.error("Support ticket DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}