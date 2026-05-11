import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
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
      const invoice = await prisma.invoice.findUnique({
        where: { id, userId: session.user.id },
        include: { items: true, template: true, company: true, assets: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(invoice);
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { userId: session.user.id },
      include: { items: true, template: true, company: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
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
        action: "GENERATE_INVOICE",
        entityType: "INVOICE",
        metadata: { templateId: data.templateId },
        idempotencyKey,
      });
    } catch (deductErr: any) {
      if (deductErr.message === "Insufficient credits") {
        return NextResponse.json(
          { error: "Insufficient credits", message: "You don't have enough credits to create an invoice. Please purchase more credits." },
          { status: 402 }
        );
      }
      throw deductErr;
    }

    try {
      // Calculate totals
      const items = data.items || [];
      let subtotal = 0;
      let taxAmount = 0;

      for (const item of items) {
        const amount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        subtotal += amount;
      }

      const taxRate = parseFloat(data.taxRate || 0);
      taxAmount = subtotal * (taxRate / 100);

      let discountAmount = 0;
      if (data.discountType === "percentage") {
        discountAmount = subtotal * (parseFloat(data.discountValue || 0) / 100);
      } else {
        discountAmount = parseFloat(data.discountValue || 0);
      }

      const grandTotal = subtotal + taxAmount - discountAmount;

      const invoice = await prisma.invoice.create({
        data: {
          userId: session.user.id,
          templateId: data.templateId,
          companyId: data.companyId,
          invoiceNumber: generateInvoiceNumber(),
          poNumber: data.poNumber,
          issueDate: new Date(data.issueDate || Date.now()),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientAddress: data.clientAddress,
          clientPhone: data.clientPhone,
          currency: data.currency || "USD",
          taxRate: taxRate,
          discountType: data.discountType || "percentage",
          discountValue: parseFloat(data.discountValue || 0),
          subtotal,
          taxAmount,
          discountAmount,
          grandTotal,
          amountPaid: parseFloat(data.amountPaid || 0),
          balanceDue: grandTotal - parseFloat(data.amountPaid || 0),
          status: data.status || "DRAFT",
          paymentTerms: data.paymentTerms,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          terms: data.terms,
          footerMessage: data.footerMessage,
          items: {
            create: items.map((item: any, index: number) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
              itemCode: item.itemCode,
              taxRate: item.taxRate ? parseFloat(item.taxRate) : null,
              sortOrder: index,
            })),
          },
        },
        include: { items: true, template: true, company: true, assets: true },
      });

      // Log success
      ActivityLogger.logWithCredits(
        session.user.id,
        "CREATE_INVOICE",
        "CREATE",
        "INVOICE",
        invoice.id,
        deductionResult.creditsDeducted,
        deductionResult.balanceBefore,
        deductionResult.balanceAfter,
        { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal }
      );

      return NextResponse.json({
        ...invoice,
        credits: {
          deducted: deductionResult.creditsDeducted,
          balanceAfter: deductionResult.balanceAfter,
          transactionId: deductionResult.transactionId,
        },
      }, { status: 201 });
    } catch (error: any) {
      await creditService.refundCredits(deductionResult.transactionId, "Invoice creation failed");
      ActivityLogger.logFailure(
        session.user.id,
        "CREATE_INVOICE",
        "CREATE",
        "INVOICE",
        error?.message || "Unknown error",
        { invoiceNumber: generateInvoiceNumber() }
      );
      throw error;
    }
  } catch (error) {
    console.error("Error creating invoice:", error);
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

    const { id, items, ...data } = await req.json();

    const existing = await prisma.invoice.findFirst({
      where: { id, userId: session.user.id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Recalculate totals
    let subtotal = 0;
    let taxAmount = 0;

    if (items) {
      for (const item of items) {
        const amount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        subtotal += amount;
      }
    } else {
      subtotal = existing.subtotal.toNumber();
    }

    const taxRate = parseFloat(data.taxRate !== undefined ? data.taxRate : existing.taxRate);
    taxAmount = subtotal * (taxRate / 100);

    let discountAmount = 0;
    const discountType = data.discountType || existing.discountType;
    const discountValue = parseFloat(data.discountValue !== undefined ? data.discountValue : existing.discountValue);

    if (discountType === "percentage") {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }

    const grandTotal = subtotal + taxAmount - discountAmount;
    const amountPaid = parseFloat(data.amountPaid !== undefined ? data.amountPaid : existing.amountPaid);

    // Update invoice and items
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        subtotal,
        taxAmount,
        discountAmount,
        grandTotal,
        balanceDue: grandTotal - amountPaid,
        items: items
          ? {
              deleteMany: {},
              create: items.map((item: any, index: number) => ({
                description: item.description,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
                itemCode: item.itemCode,
                taxRate: item.taxRate ? parseFloat(item.taxRate) : null,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { items: true, template: true, company: true, assets: true },
    });

    ActivityLogger.log({
      userId: session.user.id,
      action: "EDIT_INVOICE",
      actionType: "EDIT",
      entityType: "INVOICE",
      entityId: invoice.id,
      description: `Edited invoice ${invoice.invoiceNumber}`,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
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
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted = await prisma.invoice.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (deleted.count > 0) {
      ActivityLogger.log({
        userId: session.user.id,
        action: "DELETE_INVOICE",
        actionType: "DELETE",
        entityType: "INVOICE",
        entityId: id,
        description: "Deleted invoice",
      });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
