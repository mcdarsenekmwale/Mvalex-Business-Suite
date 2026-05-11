// app/api/invoices/templates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
 try {
    const response = await prisma.invoiceTemplate.findMany({
        orderBy: {
            createdAt: "asc",
        }
    });

    const invoiceTemplates = [
        { id: "simple", name: "Simple", color: "#2563eb" },
        { id: "corporate", name: "Corporate", color: "#0f172a" },
        { id: "service", name: "Service", color: "#0891b2" },
        { id: "detailed", name: "Detailed", color: "#7c3aed" },
    ];

    const templates = response.map((item) => {
        const defaultTemplate = invoiceTemplates.find((template) => template.id.toLowerCase() === item.type.toLowerCase());

        if (defaultTemplate) {
            return {
                ...defaultTemplate,
                templateId: item.id,
                type: item.type as any,
                description: item.description,
                config: item.config,
                isDefault: item.isDefault || false,
            }
        }

    });
    //remove all null values
    const filteredTemplates = templates.filter((item) => item !== null);
    return NextResponse.json(filteredTemplates);
 } catch (error) {
  return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
 }
}

