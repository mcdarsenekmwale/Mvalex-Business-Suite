import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import creditService from "@/lib/credits/credit-deduction.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationId } = await req.json();
    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Deduct credits first
    let deductionResult;
    try {
      deductionResult = await creditService.deductCredits({
        userId: session.user.id,
        action: "AI_ASSISTANT",
        entityType: "AI_MESSAGE",
        metadata: { conversationId },
        idempotencyKey,
      });
    } catch (deductErr: any) {
      if (deductErr.message === "Insufficient credits") {
        return NextResponse.json(
          { error: "Insufficient credits", message: "You don't have enough credits to use the AI assistant. Please purchase more credits." },
          { status: 402 }
        );
      }
      throw deductErr;
    }

    try {
      let conversation = conversationId
        ? await prisma.aIConversation.findUnique({
            where: { id: conversationId, userId: session.user.id },
            include: { messages: true },
          })
        : null;

      if (!conversation) {
        conversation = await prisma.aIConversation.create({
          data: {
            userId: session.user.id,
            title: message.slice(0, 50),
          },
          include: { messages: true },
        });
      }

      await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: message,
        },
      });

      const messages = conversation.messages.map((m: any) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      messages.push({ role: "user", content: message });

      const systemPrompt = `You are Mvalex AI Assistant, an expert business consultant and design advisor for the Mvalex Business Suite. You help users with:

1. Business card design - suggesting layouts, color schemes, fonts, and content organization
2. Invoice creation - recommending formats, item descriptions, tax calculations
3. Logo design - suggesting styles, color palettes, and brand identity concepts
4. General business advice - professionalism, branding, corporate identity
5. Platform guidance - how to use features, export options, credit system

Be professional, concise, and helpful. Provide specific actionable advice. When suggesting designs, consider modern corporate aesthetics. You can reference the user's business context if provided.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const aiResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      const savedMessage = await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: aiResponse,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      });

      // Log success
      ActivityLogger.logWithCredits(
        session.user.id,
        "AI_ASSISTANT_MESSAGE",
        "CREATE",
        "AI_CONVERSATION",
        conversation.id,
        deductionResult.creditsDeducted,
        deductionResult.balanceBefore,
        deductionResult.balanceAfter,
        { tokens: response.usage?.total_tokens }
      );

      return NextResponse.json({
        message: savedMessage,
        conversationId: conversation.id,
        credits: {
          deducted: deductionResult.creditsDeducted,
          balanceAfter: deductionResult.balanceAfter,
          transactionId: deductionResult.transactionId,
        },
      });
    } catch (error: any) {
      await creditService.refundCredits(deductionResult.transactionId, "AI assistant message failed");
      ActivityLogger.logFailure(
        session.user.id,
        "AI_ASSISTANT_MESSAGE",
        "CREATE",
        "AI_CONVERSATION",
        error?.message || "Unknown error",
        { conversationId }
      );
      throw error;
    }
  } catch (error) {
    console.error("Error in AI assistant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const conversation = await prisma.aIConversation.findUnique({
        where: { id, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(conversation);
    }

    const conversations = await prisma.aIConversation.findMany({
      where: { userId: session.user.id },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}