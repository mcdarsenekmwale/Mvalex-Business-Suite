// app/api/user/activities/export/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activities = await prisma.userActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Create CSV
    const headers = ["Date", "Action", "Entity Type", "Description", "Credits Used", "Credits Before", "Credits After"];
    const rows = activities.map(activity => [
      format(new Date(activity.createdAt), "yyyy-MM-dd HH:mm:ss"),
      activity.action,
      activity.entityType,
      activity.description || "",
      activity.creditsUsed || 0,
      activity.creditsBefore || 0,
      activity.creditsAfter || 0,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="history-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}