// app/api/support/tickets/stats/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function to check if user is support agent or admin
async function isSupportAgent(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    
    if (!user) return false;
    
    return user.roles.some(
      r => r.role.name === "SUPPORT_AGENT" || 
           r.role.name === "ADMIN" || 
           r.role.name === "SUPER_ADMIN"
    );
  } catch (error) {
    console.error("Error checking support agent role:", error);
    return false;
  }
}

// GET: Fetch support ticket statistics
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isAgent = await isSupportAgent(userId);
    
    if (!isAgent) {
      return NextResponse.json({ error: "Forbidden - Requires support agent role" }, { status: 403 });
    }

    // Get all ticket counts
    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      myAssigned,
      highPriority,
      urgentPriority,
      avgResponseTime,
    ] = await Promise.all([
      // Total tickets
      prisma.supportTicket.count(),
      
      // Open tickets
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
      
      // In progress tickets
      prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
      
      // Resolved tickets (last 7 days)
      prisma.supportTicket.count({ 
        where: { 
          status: "RESOLVED",
          resolvedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        } 
      }),
      
      // Closed tickets
      prisma.supportTicket.count({ where: { status: "CLOSED" } }),
      
      // Tickets assigned to current agent
      prisma.supportTicket.count({ 
        where: { 
          assignedTo: userId,
          status: { notIn: ["RESOLVED", "CLOSED"] }
        } 
      }),
      
      // High priority tickets
      prisma.supportTicket.count({ where: { priority: "HIGH", status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      
      // Urgent priority tickets
      prisma.supportTicket.count({ where: { priority: "URGENT", status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      
      // Calculate average response time (minutes from creation to first admin response)
      calculateAverageResponseTime(),
    ]);

    // Get tickets by priority for agents
    const ticketsByPriority = await prisma.supportTicket.groupBy({
      by: ["priority"],
      where: {
        status: { notIn: ["RESOLVED", "CLOSED"] }
      },
      _count: { priority: true },
    });

    // Get tickets by category
    const ticketsByCategory = await prisma.supportTicket.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 5,
    });

    // Get weekly trend (last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      const created = await prisma.supportTicket.count({
        where: {
          createdAt: { gte: date, lt: nextDay },
        },
      });
      
      const resolved = await prisma.supportTicket.count({
        where: {
          resolvedAt: { gte: date, lt: nextDay },
        },
      });
      
      weeklyTrend.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        created,
        resolved,
      });
    }

    // Calculate resolution rate
    const resolvedTotal = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 100) : 0;

    // Calculate average resolution time (hours)
    const resolvedTickets = await prisma.supportTicket.findMany({
      where: {
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });
    
    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, ticket) => {
        const hours = (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
    }

    const stats = {
      total,
      open,
      inProgress,
      resolved,
      closed,
      myAssigned,
      highPriority,
      urgentPriority,
      avgResponseTime: Math.round(avgResponseTime),
      avgResolutionHours,
      resolutionRate,
      ticketsByPriority: ticketsByPriority.map(t => ({
        priority: t.priority,
        count: t._count.priority,
      })),
      ticketsByCategory: ticketsByCategory.map(c => ({
        category: c.category || "Uncategorized",
        count: c._count.category,
      })),
      weeklyTrend,
    };

    return NextResponse.json({ stats });
    
  } catch (error) {
    console.error("Error fetching support ticket stats:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate average response time
async function calculateAverageResponseTime(): Promise<number> {
  try {
    // Find tickets with admin messages
    const ticketsWithMessages = await prisma.supportTicket.findMany({
      where: {
        messages: {
          some: { isAdmin: true }
        }
      },
      select: {
        createdAt: true,
        messages: {
          where: { isAdmin: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true }
        }
      },
      take: 100, // Limit for performance
    });

    let totalMessageMinutes = 0;
    let ticketsWithMessageCount = 0;

    for (const ticket of ticketsWithMessages) {
      if (ticket.messages[0]) {
        const messageTime = (ticket.messages[0].createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
        totalMessageMinutes += messageTime;
        ticketsWithMessageCount++;
      }
    }

    return ticketsWithMessageCount > 0 ? totalMessageMinutes / ticketsWithMessageCount : 0;
  } catch (error) {
    console.error("Error calculating average message time:", error);
    return 0;
  }
}