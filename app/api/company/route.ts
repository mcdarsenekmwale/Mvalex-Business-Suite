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
    const id = searchParams.get("id");

    if (id) {
      const company = await prisma.companyProfile.findUnique({
        where: { id, userId: session.user.id },
      });
      if (!company) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(company);
    }

    const companies = await prisma.companyProfile.findMany({
      where: { userId: session.user.id },
      orderBy: { isDefault: "desc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // If setting as default, unset others
    if (data.isDefault) {
      await prisma.companyProfile.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const company = await prisma.companyProfile.create({
      data: {
        userId: session.user.id,
        name: data.name,
        nameCn: data.nameCn,
        logoUrl: data.logoUrl,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        taxId: data.taxId,
        businessReg: data.businessReg,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        swiftCode: data.swiftCode,
        isDefault: data.isDefault || false,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ...data } = await req.json();

    if (data.isDefault) {
      await prisma.companyProfile.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const company = await prisma.companyProfile.update({
      where: { id, userId: session.user.id },
      data,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
