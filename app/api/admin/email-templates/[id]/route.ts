// app/api/admin/email-templates/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Fetch single email template
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching email template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update email template
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, subject, body, type, category, variables, isActive, isDefault } = data;

    // Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // If setting as default, remove default from other templates of same type
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { type: type || existingTemplate.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Extract variables from body if not provided
    let finalVariables = variables;
    if (!finalVariables || finalVariables.length === 0) {
      const variableRegex = /{{(.*?)}}/g;
      const matches = body.match(variableRegex) || [];
      finalVariables = [...new Set(matches.map((m: string) => m.replace(/[{}]/g, "").trim()))];
    }

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        name,
        subject,
        body,
        type: type || existingTemplate.type,
        category: category || existingTemplate.category,
        variables: finalVariables,
        isActive,
        isDefault: isDefault ?? existingTemplate.isDefault,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating email template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete email template
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    
    // Check admin access (super admin only for deletion)
    if (!session?.user?.role || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of default templates
    if (template.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default template. Remove default status first." },
        { status: 400 }
      );
    }

    await prisma.emailTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting email template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}