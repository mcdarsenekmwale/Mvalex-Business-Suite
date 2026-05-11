// app/api/admin/email-templates/[id]/test/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

// Initialize Resend for email sending (or use nodemailer)
const resend = new Resend(process.env.RESEND_API_KEY);

interface RouteParams {
  params: {
    id: string;
  };
}

// POST - Send test email
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    
    // Check admin access
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { testEmail, previewData } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: "Test email address is required" },
        { status: 400 }
      );
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

    // Replace variables with preview data
    let processedSubject = template.subject;
    let processedContent = template.body;

    if (previewData) {
      Object.entries(previewData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        processedSubject = processedSubject.replace(regex, value as string);
        processedContent = processedContent.replace(regex, value as string);
      });
    }

    // Send test email
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@mvalex.com",
      to: testEmail,
      subject: `[TEST] ${processedSubject}`,
      html: processedContent,
    });

    // Increment usage count
    await prisma.emailTemplate.update({
      where: { id: params.id },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}