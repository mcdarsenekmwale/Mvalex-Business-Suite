// app/api/admin/email-templates/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get email templates statistics
export async function GET() {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [total, active, usageCount, categoryCounts] = await Promise.all([
      prisma.emailTemplate.count(),
      prisma.emailTemplate.count({ where: { isActive: true } }),
      prisma.emailTemplate.aggregate({
        _sum: { usageCount: true },
      }),
      prisma.emailTemplate.groupBy({
        by: ["category"],
        _count: true,
      }),
    ]);

    const categories: Record<string, number> = {};
    categoryCounts.forEach((item) => {
      categories[item.category] = item._count;
    });

    const stats = {
      total,
      active,
      usageCount: usageCount._sum.usageCount || 0,
      categories,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching email template stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}