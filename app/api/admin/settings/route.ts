import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, UserRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS: Record<string, any> = {
  appName: "Mvalex Business Suite",
  supportEmail: "support@mvalex.com",
  maintenanceMode: false,
  enableRegistration: true,
  enableAI: true,
  maxFileSize: 10,
  sessionTimeout: 30,
  smtpHost: "smtp.sendgrid.net",
  smtpPort: 587,
  smtpUser: "apikey",
  smtpSecure: true,
};

// Get settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Merge with defaults
    const merged = { ...DEFAULT_SETTINGS, ...settingsMap };

    // Add integration statuses from env
    merged.integrations = {
      openai: !!process.env.OPENAI_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      awsS3: !!process.env.AWS_S3_BUCKET_NAME,
      sendgrid: !!process.env.SENDGRID_API_KEY,
    };

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update settings
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Upsert each setting
    const keys = Object.keys(body).filter((k) => k !== "integrations");

    for (const key of keys) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: body[key], updatedBy: session.user.id },
        create: { key, value: body[key], description: `System setting: ${key}` },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
 