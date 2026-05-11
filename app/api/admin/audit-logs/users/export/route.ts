// app/api/admin/audit/users/export/route.ts
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("dateRange");
    const fileFormat = searchParams.get("format") || "csv";
    
    // Build where clause
    let where: any = {
      actionType: { in: ["CREATE", "UPDATE", "DELETE", "SUSPEND", "ACTIVATE"] },
    };
    
    if (action && action !== "all") {
      where.action = action;
    }
    
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (dateRange && dateRange !== "all") {
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
    
    const events = await prisma.userActivity.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Prepare CSV data
    const csvData = events.map(event => ({
      Date: format(new Date(event.createdAt), "yyyy-MM-dd HH:mm:ss"),
      Action: event.action,
      "Action Type": event.actionType,
      Description: event.description,
      "Performed By": event.user?.name || event.user?.email || "System",
      "Target User ID": event.entityId || "",
      Metadata: JSON.stringify(event.metadata || {}),
    }));
    
    if (csvData.length === 0) {
      return NextResponse.json(
        { error: "No data to export" },
        { status: 404 }
      );
    }
    
    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(","),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value || "");
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      ),
    ];
    
    const csvContent = csvRows.join("\n");
    
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="user-audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting user audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}