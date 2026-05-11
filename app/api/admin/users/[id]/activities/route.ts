// app/api/admin/users/[id]/activities/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  req: Request,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const actionType = searchParams.get("actionType");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const dateRange = searchParams.get("dateRange");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = { userId };

    if (actionType && actionType !== "all") {
      where.actionType = actionType;
    }

    if (action && action !== "all") {
      where.action = action;
    }

    if (entityType && entityType !== "all") {
      where.entityType = entityType;
    }

    // Date filtering
    if (startDateParam && endDateParam) {
      where.createdAt = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    } else if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
      }
      startDate.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startDate };
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch activities with pagination
    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userActivity.count({ where }),
    ]);

    // Format activities for response
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      actionType: activity.actionType,
      entityType: activity.entityType,
      entityId: activity.entityId,
      creditsUsed: activity.creditsUsed || 0,
      creditsBefore: activity.creditsBefore,
      creditsAfter: activity.creditsAfter,
      description: activity.description,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
    }));

    return NextResponse.json({
      activities: formattedActivities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
    
  } catch (error) {
    console.error("Error fetching user activities:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Export activities as CSV
export async function POST(
  req: Request,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    const { dateRange, startDate, endDate } = await req.json();

    // Build where clause
    let where: any = { userId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDateObj: Date;
      
      switch (dateRange) {
        case "week":
          startDateObj = new Date(now);
          startDateObj.setDate(now.getDate() - 7);
          break;
        case "month":
          startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDateObj = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDateObj = new Date(now);
          startDateObj.setDate(now.getDate() - 30);
      }
      startDateObj.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startDateObj };
    }

    const activities = await prisma.userActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV
    const headers = [
      "Date",
      "Action",
      "Action Type",
      "Entity Type",
      "Entity ID",
      "Credits Used",
      "Credits Before",
      "Credits After",
      "Description",
      "IP Address",
      "User Agent",
    ];

    const rows = activities.map(activity => [
      new Date(activity.createdAt).toISOString(),
      activity.action,
      activity.actionType,
      activity.entityType,
      activity.entityId || "",
      activity.creditsUsed || 0,
      activity.creditsBefore || 0,
      activity.creditsAfter || 0,
      activity.description || "",
      activity.ipAddress || "",
      activity.userAgent || "",
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="user-${userId}-activities-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
    
  } catch (error) {
    console.error("Error exporting user activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}