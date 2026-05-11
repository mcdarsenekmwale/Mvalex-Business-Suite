import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, TextRun } from "docx";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, id, format } = await req.json();

    if (!type || !id || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    switch (format) {
      case "xlsx":
        buffer = await exportExcel(type, id);
        fileName = `${type}_${id}.xlsx`;
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "docx":
        buffer = await exportWord(type, id);
        fileName = `${type}_${id}.docx`;
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "pdf":
        // PDF is handled client-side via html2canvas + jsPDF
        return NextResponse.json(
          { error: "PDF export is handled client-side" },
          { status: 400 }
        );
      case "png":
      case "jpg":
        // Image exports are handled client-side via html2canvas
        return NextResponse.json(
          { error: "Image export is handled client-side" },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { error: "Unsupported format" },
          { status: 400 }
        );
    }

    // Save asset record
    const asset = await prisma.generatedAsset.create({
      data: {
        userId: session.user.id,
        entityType: type,
        entityId: id,
        assetType: type === "businessCard" ? "BUSINESS_CARD_FRONT" : type === "invoice" ? "INVOICE" : "LOGO",
        format: format.toUpperCase() as any,
        fileName,
        fileUrl: "generated",
        fileSize: buffer.length,
        mimeType,
      },
    });

    return NextResponse.json({
      asset,
      buffer: buffer.toString("base64"),
      fileName,
      mimeType,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}

async function exportExcel(type: string, id: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (type === "invoice") {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const worksheet = workbook.addWorksheet("Invoice");

    // Title
    worksheet.mergeCells("A1:D1");
    worksheet.getCell("A1").value = "INVOICE";
    worksheet.getCell("A1").font = { size: 24, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Invoice details
    worksheet.getCell("A3").value = `Invoice Number: ${invoice.invoiceNumber}`;
    worksheet.getCell("A4").value = `Date: ${new Date(invoice.issueDate).toLocaleDateString()}`;
    worksheet.getCell("A5").value = `Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}`;

    // Client info
    worksheet.getCell("A7").value = "Bill To:";
    worksheet.getCell("A7").font = { bold: true };
    worksheet.getCell("A8").value = invoice.clientName;
    worksheet.getCell("A9").value = invoice.clientEmail || "";
    worksheet.getCell("A10").value = invoice.clientAddress || "";

    // Items header
    const headerRow = worksheet.getRow(12);
    headerRow.values = ["Description", "Quantity", "Unit Price", "Amount"];
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
      cell.border = { bottom: { style: "thin" } };
    });

    // Items
    invoice.items.forEach((item: any, index: number) => {
      const row = worksheet.getRow(13 + index);
      row.values = [
        item.description,
        item.quantity.toNumber(),
        item.unitPrice.toNumber(),
        item.amount.toNumber(),
      ];
      row.getCell(3).numFmt = "$#,##0.00";
      row.getCell(4).numFmt = "$#,##0.00";
    });

    const totalsRow = 13 + invoice.items.length + 1;

    // Totals
    worksheet.getCell(`C${totalsRow}`).value = "Subtotal:";
    worksheet.getCell(`D${totalsRow}`).value = invoice.subtotal.toNumber();
    worksheet.getCell(`D${totalsRow}`).numFmt = "$#,##0.00";

    worksheet.getCell(`C${totalsRow + 1}`).value = `Tax (${invoice.taxRate}%):`;
    worksheet.getCell(`D${totalsRow + 1}`).value = invoice.taxAmount.toNumber();
    worksheet.getCell(`D${totalsRow + 1}`).numFmt = "$#,##0.00";

    if (invoice.discountAmount.toNumber() > 0) {
      worksheet.getCell(`C${totalsRow + 2}`).value = "Discount:";
      worksheet.getCell(`D${totalsRow + 2}`).value = -invoice.discountAmount.toNumber();
      worksheet.getCell(`D${totalsRow + 2}`).numFmt = "$#,##0.00";
    }

    const grandTotalRow = totalsRow + (invoice.discountAmount.toNumber() > 0 ? 3 : 2);
    worksheet.getCell(`C${grandTotalRow}`).value = "Grand Total:";
    worksheet.getCell(`C${grandTotalRow}`).font = { bold: true };
    worksheet.getCell(`D${grandTotalRow}`).value = invoice.grandTotal.toNumber();
    worksheet.getCell(`D${grandTotalRow}`).font = { bold: true, size: 14 };
    worksheet.getCell(`D${grandTotalRow}`).numFmt = "$#,##0.00";

    // Column widths
    worksheet.getColumn("A").width = 40;
    worksheet.getColumn("B").width = 12;
    worksheet.getColumn("C").width = 15;
    worksheet.getColumn("D").width = 15;
  }

  return await workbook.xlsx.writeBuffer() as unknown as Buffer;
}

async function exportWord(type: string, id: string): Promise<Buffer> {
  if (type === "invoice") {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const currencySymbol = invoice.currency === "USD" ? "$" : invoice.currency === "CNY" ? "¥" : invoice.currency === "EUR" ? "€" : "£";

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "INVOICE",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Invoice Number: `, bold: true }),
              new TextRun(invoice.invoiceNumber),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: `, bold: true }),
              new TextRun(new Date(invoice.issueDate).toLocaleDateString()),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Due Date: `, bold: true }),
              new TextRun(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [new TextRun({ text: "Bill To:", bold: true })],
          }),
          new Paragraph(invoice.clientName),
          new Paragraph(invoice.clientEmail || ""),
          new Paragraph(invoice.clientAddress || ""),
          new Paragraph({ text: "" }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Price", bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                ],
              }),
              ...invoice.items.map((item: any, index: number) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(item.description)] }),
                    new TableCell({ children: [new Paragraph(item.quantity.toString())] }),
                    new TableCell({ children: [new Paragraph(`${currencySymbol}${item.unitPrice.toFixed(2)}`)] }),
                    new TableCell({ children: [new Paragraph(`${currencySymbol}${item.amount.toFixed(2)}`)] }),
                  ],
                })
              ),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Subtotal: `, bold: true }),
              new TextRun(`${currencySymbol}${invoice.subtotal.toFixed(2)}`),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Tax (${invoice.taxRate}%): `, bold: true }),
              new TextRun(`${currencySymbol}${invoice.taxAmount.toFixed(2)}`),
            ],
          }),
          invoice.discountAmount.toNumber() > 0
            ? new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Discount: `, bold: true }),
                  new TextRun(`-${currencySymbol}${invoice.discountAmount.toFixed(2)}`),
                ],
              })
            : new Paragraph(""),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Grand Total: `, bold: true, size: 24 }),
              new TextRun({ text: `${currencySymbol}${invoice.grandTotal.toFixed(2)}`, size: 24 }),
            ],
          }),
          ...(invoice.notes
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Notes:", bold: true })] }),
                new Paragraph(invoice.notes),
              ]
            : []),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }

  // Generic document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Exported Document",
          heading: HeadingLevel.HEADING_1,
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
