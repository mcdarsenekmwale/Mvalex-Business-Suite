// app/api/admin/audit/security/export/route.ts
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
    const severity = searchParams.get("severity");
    const eventType = searchParams.get("eventType");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("dateRange");
    const fileType = searchParams.get("format") || "csv";

    // Build where clause
    let where: any = {
      actionType: "SECURITY",
    };

    if (severity && severity !== "all") {
      where.metadata = {
        path: ["severity"],
        equals: severity,
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
      Severity: (event.metadata as any)?.severity || determineSeverity(event.action),
      Description: event.description,
      User: event.user?.name || event.user?.email || "System",
      "User ID": event.userId,
      "IP Address": (event.metadata as any)?.ipAddress || event.ipAddress || "N/A",
      "User Agent": (event.metadata as any)?.userAgent || event.userAgent || "N/A",
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
        "Content-Disposition": `attachment; filename="security-audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting security audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function determineSeverity(eventType: string): string {
  const severityMap: Record<string, string> = {
    LOGIN_FAILURE: "MEDIUM",
    LOGIN_SUCCESS: "LOW",
    USER_DELETED: "HIGH",
    USER_SUSPENDED: "HIGH",
    ROLE_CHANGED: "HIGH",
    PERMISSION_CHANGED: "HIGH",
    MFA_DISABLED: "HIGH",
    IP_BLOCKED: "HIGH",
    USER_ACTIVATED: "MEDIUM",
    PASSWORD_CHANGED: "MEDIUM",
    API_KEY_CREATED: "MEDIUM",
    API_KEY_REVOKED: "MEDIUM",
    SESSION_REVOKED: "MEDIUM",
    LOGOUT: "LOW",
    USER_CREATED: "LOW",
    MFA_ENABLED: "LOW",
    RATE_LIMIT_EXCEEDED: "LOW",
  };
  return severityMap[eventType] || "MEDIUM";
}