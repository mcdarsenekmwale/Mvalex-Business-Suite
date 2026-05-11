// app/api/business-cards/templates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const response = await prisma.businessCardTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const defaultTemplates = [
    { id: "modern", name: "Modern", color: "#2563eb", secondaryColor: "#1e40af" },
    { id: "minimal", name: "Minimal", color: "#18181b", secondaryColor: "#52525b" },
    { id: "corporate", name: "Corporate", color: "#0f172a", secondaryColor: "#64748b" },
    { id: "tech", name: "Tech", color: "#0891b2", secondaryColor: "#06b6d4" },
    { id: "creative", name: "Creative", color: "#7c3aed", secondaryColor: "#a78bfa" },
    { id: "luxury", name: "Luxury", color: "#b45309", secondaryColor: "#d97706" },
 ];

 const templates =  response.map((item) => {
    const defaultTemplate = defaultTemplates.find((defaultItem) => defaultItem.name.toLowerCase() === item.category.toLowerCase());
    if (defaultTemplate) {
        return {
            ...defaultTemplate,
            category: item.category as any,
            templateId: item.id,
            description: item.description,
            isDefault: item.isDefault || false,
            previewUrl: item.previewUrl,
        }
    }
 });

 //remove all null values
 const filteredTemplates = templates.filter((item) => item !== null);
  return NextResponse.json(filteredTemplates);
}