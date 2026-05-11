import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import creditService from "@/lib/credits/credit-deduction.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const card = await prisma.businessCard.findUnique({
        where: { id, userId: session.user.id },
        include: { template: true, assets: true },
      });
      if (!card) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(card);
    }

    const cards = await prisma.businessCard.findMany({
      where: { userId: session.user.id }, 
      include: { template: true, assets: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("Error fetching business cards:", error);
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
    const idempotencyKeyHolder = btoa(crypto.getRandomValues(new Uint8Array(24)).toString());
    const idempotencyKey = req.headers.get("x-idempotency-key") || idempotencyKeyHolder;

    // Deduct credits first
    let deductionResult;
    try {

      deductionResult = await creditService.deductCredits({
        userId: session.user.id,
        action: "GENERATE_BUSINESS_CARD",
        entityType: "BUSINESS_CARD",
        metadata: { templateId: data.templateId },
        idempotencyKey,
      });
     
    } catch (deductErr: any) {
      console.log(deductErr)
      if (deductErr.message === "Insufficient credits") {
        return NextResponse.json(
          { error: "Insufficient credits", message: "You don't have enough credits to create a business card. Please purchase more credits." },
          { status: 402 }
        );
      }
      throw deductErr;
    }

    try {
      // Generate QR code
      let qrCodeUrl = null;
      if (data.qrCodeType && data.qrCodeData) {
        try {
          qrCodeUrl = await QRCode.toDataURL(data.qrCodeData, {
            width: 400,
            margin: 2,
            color: {
              dark: data.colorPrimary || "#000000",
              light: "#FFFFFF",
            },
          });
        } catch (e) {
          console.error("QR generation failed:", e);
        }
      }

      const card = await prisma.businessCard.create({
        data: {
          userId: session.user.id,
          templateId: data.templateId,
          name: data.name,
          title: data.title,
          email: data.email,
          phone: data.phone,
          phone2: data.phone2,
          address: data.address,
          website: data.website,
          companyName: data.companyName,
          companyNameCn: data.companyNameCn,
          qrCodeType: data.qrCodeType || "vcard",
          qrCodeData: data.qrCodeData,
          qrCodeUrl,
          colorPrimary: data.colorPrimary,
          colorSecondary: data.colorSecondary,
          fontFamily: data.fontFamily,
          frontConfig: data.frontConfig || {},
          backConfig: data.backConfig || {},
          status: "PUBLISHED",
        },
        include: { template: true, assets: true },
      });

      // Log success activity
      ActivityLogger.logWithCredits(
        session.user.id,
        "CREATE_BUSINESS_CARD",
        "CREATE",
        "BUSINESS_CARD",
        card.id,
        deductionResult.creditsDeducted,
        deductionResult.balanceBefore,
        deductionResult.balanceAfter,
        { templateId: data.templateId, name: data.name }
      );

      return NextResponse.json({
        ...card,
        credits: {
          deducted: deductionResult.creditsDeducted,
          balanceAfter: deductionResult.balanceAfter,
          transactionId: deductionResult.transactionId,
        },
      }, { status: 201 });
    } catch (error: any) {
      // Refund on failure
      await creditService.refundCredits(deductionResult.transactionId, "Business card creation failed");
      // Log failure
      ActivityLogger.logFailure(
        session.user.id,
        "CREATE_BUSINESS_CARD",
        "CREATE",
        "BUSINESS_CARD",
        error?.message || "Unknown error",
        { templateId: data.templateId, name: data.name }
      );
      throw error;
    }
  } catch (error) {
    console.error("Error creating business card:", error);
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

    const existing = await prisma.businessCard.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Regenerate QR if data changed
    let qrCodeUrl = existing.qrCodeUrl;
    if (data.qrCodeData && data.qrCodeData !== existing.qrCodeData) {
      try {
        qrCodeUrl = await QRCode.toDataURL(data.qrCodeData, {
          width: 400,
          margin: 2,
          color: {
            dark: data.colorPrimary || existing.colorPrimary || "#000000",
            light: "#FFFFFF",
          },
        });
      } catch (e) {
        console.error("QR regeneration failed:", e);
      }
    }

    const card = await prisma.businessCard.update({
      where: { id },
      data: {
        ...data,
        qrCodeUrl,
      },
      include: { template: true, assets: true },
    });

    ActivityLogger.log({
      userId: session.user.id,
      action: "EDIT_BUSINESS_CARD",
      actionType: "EDIT",
      entityType: "BUSINESS_CARD",
      entityId: card.id,
      description: `Edited business card "${card.name}"`,
      metadata: { name: card.name },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("Error updating business card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const deleted = await prisma.businessCard.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (deleted.count > 0) {
      ActivityLogger.log({
        userId: session.user.id,
        action: "DELETE_BUSINESS_CARD",
        actionType: "DELETE",
        entityType: "BUSINESS_CARD",
        entityId: id,
        description: "Deleted business card",
      });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting business card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
