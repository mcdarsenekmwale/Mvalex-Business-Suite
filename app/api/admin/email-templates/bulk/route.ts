// app/api/admin/email-templates/bulk/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Bulk operations on templates
export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Check super admin access for bulk operations
    if (!session?.user?.role || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, templateIds, data } = body;

    if (!action || !templateIds || templateIds.length === 0) {
      return NextResponse.json(
        { error: "Action and template IDs are required" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "activate":
        result = await prisma.emailTemplate.updateMany({
          where: { id: { in: templateIds } },
          data: { isActive: true },
        });
        break;

      case "deactivate":
        result = await prisma.emailTemplate.updateMany({
          where: { id: { in: templateIds } },
          data: { isActive: false },
        });
        break;

      case "delete":
        // Prevent deleting default templates
        const defaultTemplates = await prisma.emailTemplate.findMany({
          where: {
            id: { in: templateIds },
            isDefault: true,
          },
        });

        if (defaultTemplates.length > 0) {
          return NextResponse.json(
            { error: "Cannot delete default templates. Remove default status first." },
            { status: 400 }
          );
        }

        result = await prisma.emailTemplate.deleteMany({
          where: { id: { in: templateIds } },
        });
        break;

      case "changeCategory":
        if (!data?.category) {
          return NextResponse.json(
            { error: "Category is required for changeCategory action" },
            { status: 400 }
          );
        }
        result = await prisma.emailTemplate.updateMany({
          where: { id: { in: templateIds } },
          data: { category: data.category },
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error performing bulk operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}