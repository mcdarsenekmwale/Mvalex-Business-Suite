// app/api/admin/audit/system/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
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
    const status = searchParams.get("status");
    const component = searchParams.get("component");
    const eventType = searchParams.get("eventType");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("dateRange");

    // Build where clause
    let where: any = {
      actionType: "SYSTEM",
    };

    if (status && status !== "all") {
      where.metadata = {
        path: ["status"],
        equals: status,
      };
    }

    if (component && component !== "all") {
      where.metadata = {
        path: ["component"],
        equals: component,
      };
    }

    if (eventType && eventType !== "all") {
      where.action = eventType;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
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

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No data to export" },
        { status: 404 }
      );
    }

    // Prepare CSV data
    const csvData = events.map(event => ({
      "Date/Time": format(new Date(event.createdAt), "yyyy-MM-dd HH:mm:ss"),
      "Event Type": event.action,
      Status: (event.metadata as any)?.status || "INFO",
      Component: (event.metadata as any)?.component || "system",
      Description: event.description,
      "Duration (ms)": (event.metadata as any)?.duration || "",
      User: event.user?.name || event.user?.email || "System",
      Metadata: JSON.stringify(event.metadata || {}),
    }));

    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(","),
      ...csvData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
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
        "Content-Disposition": `attachment; filename="system-audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting system audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}