// app/api/admin/pricing/reset/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_PRICING_RULES = [
  { action: "CREATE_BUSINESS_CARD", cost: 5, description: "Create a new business card", isActive: true },
  { action: "EDIT_BUSINESS_CARD", cost: 2, description: "Edit existing business card", isActive: true },
  { action: "CREATE_INVOICE", cost: 5, description: "Generate a new invoice", isActive: true },
  { action: "EDIT_INVOICE", cost: 2, description: "Edit existing invoice", isActive: true },
  { action: "GENERATE_LOGO", cost: 20, description: "Generate AI-powered logo", isActive: true },
  { action: "EXPORT_BUSINESS_CARD_PNG", cost: 3, description: "Export business card as PNG", isActive: true },
  { action: "EXPORT_INVOICE_PDF", cost: 3, description: "Export invoice as PDF", isActive: true },
  { action: "AI_CHAT_MESSAGE", cost: 1, description: "Send message to AI assistant", isActive: true },
  { action: "PREMIUM_TEMPLATE", cost: 30, description: "Use premium template", isActive: true },
];

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all existing rules
    await prisma.pricingRule.deleteMany();
    
    // Create default rules
    const rules = await prisma.$transaction(
      DEFAULT_PRICING_RULES.map((rule: any) =>
        prisma.pricingRule.create({ data: rule as any })
      )
    );

    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error("Error resetting pricing rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}