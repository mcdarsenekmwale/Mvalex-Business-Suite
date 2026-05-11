// app/api/admin/tickets/analytics/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateRange, calculateMetrics, calculateTicketVolume, calculateResponseTimes, calculatePriorityDistribution, generateInsights } from "@/lib/admin/helpers";

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "week";

    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch all tickets in date range
    const tickets = await prisma.supportTicket.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            message: true,
            isAdmin: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate metrics
    const metrics = calculateMetrics(tickets);
    
    // Calculate ticket volume by day
    const ticketVolume = calculateTicketVolume(tickets, startDate, endDate);
    
    // Calculate response time by hour
    const responseTimes = calculateResponseTimes(tickets);
    
    // Calculate priority distribution
    const priorityDistribution = calculatePriorityDistribution(tickets);
    
    // Calculate additional insights
    const insights = generateInsights(metrics, tickets);

    return NextResponse.json({
      metrics,
      ticketVolume,
      responseTimes,
      priorityDistribution,
      insights,
      totalTickets: tickets.length,
      dateRange: { startDate, endDate },
    });
    
  } catch (error) {
    console.error("Error fetching ticket analytics:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

