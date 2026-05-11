import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import creditService from "@/lib/credits/credit-deduction.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const logo = await prisma.logo.findUnique({
        where: { id, userId: session.user.id },
        include: { variations: true },
      });
      if (!logo) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(logo);
    }

    const logos = await prisma.logo.findMany({
      where: { userId: session.user.id },
      include: { variations: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logos);
  } catch (error) {
    console.error("Error fetching logos:", error);
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

    const { businessName, slogan, industry, style, colorPalette, additionalInfo } =
      await req.json();
    const idempotencyKeyHolder = btoa(crypto.getRandomValues(new Uint8Array(24)).toString());
    const idempotencyKey = req.headers.get("x-idempotency-key") || idempotencyKeyHolder;

    // Deduct credits first
    let deductionResult;
    try {
      deductionResult = await creditService.deductCredits({
        userId: session.user.id,
        action: "GENERATE_LOGO",
        entityType: "LOGO",
        metadata: { businessName },
        idempotencyKey,
      });
    } catch (deductErr: any) {
      if (deductErr.message === "Insufficient credits") {
        return NextResponse.json(
          { error: "Insufficient credits", message: "You don't have enough credits to generate a logo. Please purchase more credits." },
          { status: 402 }
        );
      }
      throw deductErr;
    }

    try {
      // Create logo record
      const logo = await prisma.logo.create({
        data: {
          userId: session.user.id,
          businessName,
          slogan,
          industry,
          style: style || "MODERN",
          colorPalette: colorPalette || [],
          additionalInfo,
          status: "GENERATING",
          prompt: `Professional logo design for ${businessName}${slogan ? `, ${slogan}` : ""}. ${industry ? `Industry: ${industry}.` : ""} Style: ${style || "modern"}. ${colorPalette?.length ? `Colors: ${colorPalette.join(", ")}.` : ""} ${additionalInfo || ""} Clean, vector-style, suitable for business use, transparent background friendly, high quality, professional corporate identity.`,
        },
      });

      // Generate AI logo in background
      generateAILogo(logo.id, logo.prompt || "", session.user.id, deductionResult);

      return NextResponse.json({
        ...logo,
        credits: {
          deducted: deductionResult.creditsDeducted,
          balanceAfter: deductionResult.balanceAfter,
          transactionId: deductionResult.transactionId,
        },
      }, { status: 201 });
    } catch (error: any) {
      await creditService.refundCredits(deductionResult.transactionId, "Logo creation failed");
      ActivityLogger.logFailure(
        session.user.id,
        "GENERATE_LOGO",
        "CREATE",
        "LOGO",
        error?.message || "Unknown error",
        { businessName }
      );
      throw error;
    }
  } catch (error) {
    console.error("Error creating logo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateAILogo(
  logoId: string,
  prompt: string,
  userId: string,
  deductionResult: { transactionId: string; creditsDeducted: number; balanceBefore: number; balanceAfter: number }
) {
  try {
    const variations = [
      { type: "FULL_COLOR", suffix: "full color vibrant" },
      { type: "MONOCHROME", suffix: "monochrome black and white elegant" },
      { type: "ICON_ONLY", suffix: "icon symbol only no text minimal" },
    ];

    for (const variation of variations) {
      try {
        const fullPrompt = `${prompt}. ${variation.suffix}. Professional logo design, clean vector style, high resolution, suitable for business cards and branding.`;

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });

        const imageUrl = response.data?.[0]?.url;

        if (imageUrl) {
          await prisma.logoVariation.create({
            data: {
              logoId,
              type: variation.type as any,
              imageUrl,
              width: 1024,
              height: 1024,
              hasPng: true,
            },
          });
        }
      } catch (e) {
        console.error(`Error generating ${variation.type} logo:`, e);
      }
    }

    await prisma.logo.update({
      where: { id: logoId },
      data: { status: "COMPLETED" },
    });

    // Log completion
    ActivityLogger.logWithCredits(
      userId,
      "GENERATE_LOGO_COMPLETED",
      "CREATE",
      "LOGO",
      logoId,
      deductionResult.creditsDeducted,
      deductionResult.balanceBefore,
      deductionResult.balanceAfter,
      { status: "COMPLETED" }
    );
  } catch (error: any) {
    console.error("Error in AI logo generation:", error);
    await prisma.logo.update({
      where: { id: logoId },
      data: { status: "FAILED" },
    });
    // Refund on total failure
    try {
      const { default: creditSvc } = await import("@/lib/credits/credit-deduction.service");
      await creditSvc.refundCredits(deductionResult.transactionId, "AI logo generation failed");
    } catch (refundErr) {
      console.error("Failed to refund logo credits:", refundErr);
    }

    ActivityLogger.logFailure(
      userId,
      "GENERATE_LOGO",
      "CREATE",
      "LOGO",
      error?.message || "AI generation failed",
      { logoId }
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
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted = await prisma.logo.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (deleted.count > 0) {
      ActivityLogger.log({
        userId: session.user.id,
        action: "DELETE_LOGO",
        actionType: "DELETE",
        entityType: "LOGO",
        entityId: id,
        description: "Deleted logo",
      });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
