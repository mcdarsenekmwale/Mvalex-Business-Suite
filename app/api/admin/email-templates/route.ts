// app/api/admin/email-templates/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch all email templates
export async function GET() {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" }
      ],
      select: {
        id: true,
        name: true,
        subject: true,
        body: true,
        type: true,
        category: true,
        variables: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        usageCount: true,
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new email template
export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, subject, body, type, category, variables, isActive, isDefault } = data;

    // Validate required fields
    if (!name || !subject || !body) {
      return NextResponse.json(
        { error: "Name, subject, and body are required" },
        { status: 400 }
      );
    }

    // If setting as default, remove default from other templates of same type
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { type, isDefault: true },
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

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body,
        type,
        category: category || type,
        variables: finalVariables,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        usageCount: 0,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}