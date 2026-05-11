import { NextResponse } from "next/server"; 
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "businessCard") {
      const templates = await prisma.businessCardTemplate.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json(templates);
    }

    if (type === "invoice") {
      const templates = await prisma.invoiceTemplate.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(templates);
    }

    return NextResponse.json({ error: "Type required" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
