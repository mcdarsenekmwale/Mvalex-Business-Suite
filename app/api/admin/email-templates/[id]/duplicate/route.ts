// app/api/admin/email-templates/[id]/duplicate/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

// POST - Duplicate email template
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const originalTemplate = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!originalTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Create duplicate
    const duplicatedTemplate = await prisma.emailTemplate.create({
      data: {
        name: `${originalTemplate.name} (Copy)`,
        subject: originalTemplate.subject,
        body: originalTemplate.body,
        type: originalTemplate.type,
        category: originalTemplate.category,
        variables: originalTemplate.variables as any,
        isActive: false, // Set inactive by default
        isDefault: false, // Never default on duplicate
        usageCount: 0,
      },
    });

    return NextResponse.json(duplicatedTemplate, { status: 201 });
  } catch (error) {
    console.error("Error duplicating email template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}