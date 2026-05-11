// app/api/admin/pricing/rules/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PricingRule } from "@/generated/prisma/client";

const DEFAULT_PRICING_RULES = [
  { action: "CREATE_BUSINESS_CARD", cost: 5, description: "Create a new business card", isActive: true },
  { action: "EDIT_BUSINESS_CARD", cost: 2, description: "Edit existing business card", isActive: true },
  { action: "CREATE_INVOICE", cost: 5, description: "Generate a new invoice", isActive: true },
  { action: "EDIT_INVOICE", cost: 2, description: "Edit existing invoice", isActive: true },
  { action: "GENERATE_LOGO", cost: 20, description: "Generate AI-powered logo", isActive: true },
  { action: "GENERATE_LOGO_VARIATIONS", cost: 10, description: "Generate logo variations", isActive: true },
  { action: "EXPORT_BUSINESS_CARD_PNG", cost: 3, description: "Export business card as PNG", isActive: true },
  { action: "EXPORT_BUSINESS_CARD_PDF", cost: 5, description: "Export business card as PDF", isActive: true },
  { action: "EXPORT_INVOICE_PDF", cost: 3, description: "Export invoice as PDF", isActive: true },
  { action: "EXPORT_INVOICE_EXCEL", cost: 4, description: "Export invoice as Excel", isActive: true },
  { action: "EXPORT_LOGO_PNG", cost: 3, description: "Export logo as PNG", isActive: true },
  { action: "EXPORT_LOGO_SVG", cost: 5, description: "Export logo as SVG", isActive: true },
  { action: "AI_CHAT_MESSAGE", cost: 1, description: "Send message to AI assistant", isActive: true },
  { action: "AI_DESIGN_SUGGESTION", cost: 2, description: "Get AI design suggestions", isActive: true },
  { action: "PREMIUM_TEMPLATE", cost: 30, description: "Use premium template", isActive: true },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rules = await prisma.pricingRule.findMany();
    
    if (rules.length === 0) {
      // Create default rules
      rules = await prisma.$transaction(
        DEFAULT_PRICING_RULES.map(rule =>
          prisma.pricingRule.create({ data: rule as any })
        )
      );
    }

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching pricing rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rules } = await req.json();

    await prisma.$transaction(
      rules.map((rule: PricingRule) =>
        prisma.pricingRule.update({
          where: { id: rule.id },
          data: {
            cost: rule.cost,
            isActive: rule.isActive,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating pricing rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}