// lib/services/export.service.ts
import { prisma } from "@/lib/prisma";
import { ExportFormat, AssetType } from "@/generated/prisma/client";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import * as PDFDocument from "pdf-lib";
import * as ExcelJS from "exceljs";
import * as docx from "docx";
import sharp from "sharp";
import JSZip from "jszip";

interface ExportOptions {
  quality?: number; // For images (1-100)
  pageSize?: "A4" | "Letter" | "Legal"; // For PDFs
  orientation?: "portrait" | "landscape";
  includeMetadata?: boolean;
}

export class ExportService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.S3_BUCKET_NAME || "mvalex-exports";
  }

  async createExport(
    userId: string,
    assetId: string,
    assetType: AssetType,
    format: ExportFormat,
    options?: ExportOptions
  ) {
    // Check for existing export to avoid duplicates
    const existingExport = await prisma.export.findUnique({
      where: {
        assetId_assetType_format: {
          assetId,
          assetType,
          format,
        },
      },
    });

    if (existingExport && existingExport.status === "COMPLETED") {
      return existingExport;
    }

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        id: uuidv4(),
        userId,
        assetId,
        assetType,
        format,
        status: "PENDING",
        metadata: (options || {}) as Record<string, any>,
        fileUrl: "",
        fileName: "",
        mimeType: "",
        fileSize: 0,
      },
    });

    // Process export asynchronously
    this.processExport(exportRecord.id, options).catch(error => {
      console.error(`Export ${exportRecord.id} failed:`, error);
    });

    return exportRecord;
  }

  async createBatchExport(
    userId: string,
    assetIds: string[],
    assetType: AssetType,
    format: ExportFormat
  ) {
    const batchId = uuidv4();
    
    const batch = await prisma.exportBatch.create({
      data: {
        userId,
        batchId,
        assetIds,
        assetType,
        format,
        totalItems: assetIds.length,
        status: "PENDING",
      },
    });

    // Process batch asynchronously
    this.processBatchExport(batch.id).catch(error => {
      console.error(`Batch export ${batch.id} failed:`, error);
    });

    return batch;
  }

  private async processExport(exportId: string, options?: ExportOptions) {
    try {
      // Update status to processing
      await prisma.export.update({
        where: { id: exportId },
        data: { status: "PROCESSING" },
      });

      const exportRecord = await prisma.export.findUnique({
        where: { id: exportId },
        include: { user: true },
      });

      if (!exportRecord) {
        throw new Error("Export record not found");
      }

      // Generate file based on asset type and format
      let fileBuffer: Buffer;
      let fileName: string;
      let mimeType: string;

      switch (exportRecord.assetType) {
        case "BUSINESS_CARD":
          fileBuffer = await this.generateBusinessCardExport(
            exportRecord.assetId,
            exportRecord.format,
            options
          );
          break;
        case "INVOICE":
          fileBuffer = await this.generateInvoiceExport(
            exportRecord.assetId,
            exportRecord.format,
            options
          );
          break;
        case "LOGO":
          fileBuffer = await this.generateLogoExport(
            exportRecord.assetId,
            exportRecord.format,
            options
          );
          break;
        default:
          throw new Error(`Unsupported asset type: ${exportRecord.assetType}`);
      }

      fileName = `${exportRecord.assetType.toLowerCase()}_${exportRecord.assetId}_${Date.now()}.${this.getFileExtension(exportRecord.format)}`;
      mimeType = this.getMimeType(exportRecord.format);

      // Upload to S3
      const fileUrl = await this.uploadToS3(fileBuffer, fileName, mimeType);

      // Update export record
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: "COMPLETED",
          fileUrl,
          fileName,
          mimeType,
          fileSize: fileBuffer.length,
        },
      });

      // Clean up old exports
      await this.cleanupOldExports(exportRecord.userId);

    } catch (error) {
      console.error(`Export processing error for ${exportId}:`, error);
      
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  private async processBatchExport(batchId: string) {
    try {
      const batch = await prisma.exportBatch.findUnique({
        where: { id: batchId },
      });

      if (!batch) {
        throw new Error("Batch not found");
      }

      await prisma.exportBatch.update({
        where: { id: batchId },
        data: { status: "PROCESSING" },
      });

      const zip = new JSZip();
      let completed = 0;
      let failed = 0;

      for (const assetId of batch.assetIds) {
        try {
          const exportRecord = await this.createExport(
            batch.userId,
            assetId,
            batch.assetType,
            batch.format
          );

          // Wait for export to complete (max 30 seconds)
          let retries = 30;
          while (retries > 0) {
            const updated = await prisma.export.findUnique({
              where: { id: exportRecord.id },
            });
            
            if (updated?.status === "COMPLETED") {
              // Download file and add to zip
              const response = await fetch(updated.fileUrl);
              const fileBuffer = await response.arrayBuffer();
              zip.file(`${assetId}.${this.getFileExtension(batch.format)}`, Buffer.from(fileBuffer));
              completed++;
              break;
            } else if (updated?.status === "FAILED") {
              failed++;
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries--;
          }
        } catch (error) {
          console.error(`Failed to export asset ${assetId}:`, error);
          failed++;
        }

        await prisma.exportBatch.update({
          where: { id: batchId },
          data: {
            completedItems: completed,
            failedItems: failed,
          },
        });
      }

      // Generate zip file
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const zipFileName = `export_batch_${batch.batchId}.zip`;
      const zipUrl = await this.uploadToS3(zipBuffer, zipFileName, "application/zip");

      await prisma.exportBatch.update({
        where: { id: batchId },
        data: {
          status: "COMPLETED",
          zipFileUrl: zipUrl,
          completedAt: new Date(),
        },
      });

    } catch (error) {
      console.error(`Batch export error for ${batchId}:`, error);
      
      await prisma.exportBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
        },
      });
    }
  }

  private async generateBusinessCardExport(
    cardId: string,
    format: ExportFormat,
    options?: ExportOptions
  ): Promise<Buffer> {
    const card = await prisma.businessCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new Error("Business card not found");
    }

    // Generate HTML/CSS for business card
    const html = this.generateBusinessCardHTML({
      front: {
        name: card.name,
        title: card.title,
        email: card.email,
        phone: card.phone,
        phone2: card.phone2,
        address: card.address,
        website: card.website,
        company: (card as any).company,
      },
      back: (card as any).backContent,
    });
    
    switch (format) {
      case "PNG":
      case "JPG":
      case "JPEG":
        return await this.htmlToImage(html, format, options?.quality);
      case "PDF":
        return await this.htmlToPDF(html, options);
      case "DOCX":
        return await this.htmlToDocx(html);
      default:
        throw new Error(`Unsupported format for business card: ${format}`);
    }
  }

  private async generateInvoiceExport(
    invoiceId: string,
    format: ExportFormat,
    options?: ExportOptions
  ): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    switch (format) {
      case "PDF":
        return await this.generateInvoicePDF(invoice);
      case "XLSX":
        return await this.generateInvoiceExcel(invoice);
      case "DOCX":
        return await this.generateInvoiceDocx(invoice);
      case "PNG":
      case "JPG":
      case "JPEG":
        const html = this.generateInvoiceHTML(invoice);
        return await this.htmlToImage(html, format, options?.quality);
      default:
        throw new Error(`Unsupported format for invoice: ${format}`);
    }
  }

  private async generateLogoExport(
    logoId: string,
    format: ExportFormat,
    options?: ExportOptions
  ): Promise<Buffer> {
    const logo = await prisma.logo.findUnique({
      where: { id: logoId },
    });

    if (!logo) {
      throw new Error("Logo not found");
    }

    // Get the original logo URL from variations
    const variations = (logo as any).variations;
    const logoUrl = variations.fullColor || variations.iconOnly;

    if (!logoUrl) {
      throw new Error("Logo image not found");
    }

    // Download logo from URL
    const response = await fetch(logoUrl);
    const logoBuffer = Buffer.from(await response.arrayBuffer());

    switch (format) {
      case "PNG":
        if (options?.quality) {
          return await sharp(logoBuffer).png({ quality: options.quality }).toBuffer();
        }
        return logoBuffer;
      case "JPG":
      case "JPEG":
        return await sharp(logoBuffer)
          .jpeg({ quality: options?.quality || 90 })
          .toBuffer();
      case "SVG":
        // If original is SVG, return as is
        if (logoUrl.endsWith('.svg')) {
          return logoBuffer;
        }
        // Convert PNG to SVG (simplified)
        return await sharp(logoBuffer).toFormat('svg').toBuffer();
      case "PDF":
        return await this.imageToPDF(logoBuffer);
      default:
        throw new Error(`Unsupported format for logo: ${format}`);
    }
  }

  private async htmlToImage(html: string, format: ExportFormat, quality: number = 90): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const screenshotBuffer = await page.screenshot({
        type: format === "PNG" ? "png" : "jpeg",
        quality: format !== "PNG" ? quality : undefined,
        fullPage: true,
      });
      
      return Buffer.from(screenshotBuffer);
    } finally {
      await browser.close();
    }
  }

  private async htmlToPDF(html: string, options?: ExportOptions): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: options?.pageSize?.toLowerCase() as any || 'a4',
        landscape: options?.orientation === 'landscape',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async htmlToDocx(html: string): Promise<Buffer> {
    // Convert HTML to DOCX using docx library
    const { Document, Packer, Paragraph, TextRun } = docx;
    
    // Simple HTML to DOCX conversion
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: html.replace(/<[^>]*>/g, ''), // Strip HTML tags
                size: 24,
              }),
            ],
          }),
        ],
      }],
    });
    
    return await Packer.toBuffer(doc);
  }

  private async generateInvoicePDF(invoice: any): Promise<Buffer> {
    // Create PDF using pdf-lib
    const pdfDoc = await PDFDocument.PDFDocument.create();
    const page = pdfDoc.addPage();
    
    // Add invoice content
    page.drawText(`Invoice #${invoice.invoiceNumber}`, { x: 50, y: page.getHeight() - 50, size: 20 });
    page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { x: 50, y: page.getHeight() - 80, size: 12 });
    page.drawText(`Total: ${invoice.currency} ${invoice.total}`, { x: 50, y: page.getHeight() - 110, size: 14 });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async generateInvoiceExcel(invoice: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');
    
    worksheet.columns = [
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
    ];
    
    const items = invoice.items as any[];
    items.forEach(item => {
      worksheet.addRow(item);
    });
    
    worksheet.addRow({});
    worksheet.addRow({ description: 'Subtotal', amount: invoice.subtotal });
    worksheet.addRow({ description: 'Tax', amount: invoice.taxRate });
    worksheet.addRow({ description: 'Total', amount: invoice.total });
    
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generateInvoiceDocx(invoice: any): Promise<Buffer> {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = docx;
    
    const items = invoice.items as any[];
    const tableRows = items.map(item => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.description)] }),
          new TableCell({ children: [new Paragraph(item.quantity.toString())] }),
          new TableCell({ children: [new Paragraph(item.unitPrice.toString())] }),
          new TableCell({ children: [new Paragraph(item.amount.toString())] }),
        ],
      })
    );
    
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: `Invoice #${invoice.invoiceNumber}`, bold: true, size: 32 })] }),
          new Paragraph({ children: [new TextRun({ text: `Date: ${new Date(invoice.createdAt).toLocaleDateString()}` })] }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Description")] }),
                  new TableCell({ children: [new Paragraph("Quantity")] }),
                  new TableCell({ children: [new Paragraph("Unit Price")] }),
                  new TableCell({ children: [new Paragraph("Amount")] }),
                ],
              }),
              ...tableRows,
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: `Total: ${invoice.currency} ${invoice.total}`, bold: true })] }),
        ],
      }],
    });
    
    return await Packer.toBuffer(doc);
  }

  private async imageToPDF(imageBuffer: Buffer): Promise<Buffer> {
    const pdfDoc = await PDFDocument.PDFDocument.create();
    const image = await pdfDoc.embedPng(imageBuffer);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return Buffer.from(await pdfDoc.save());
  }

  private generateBusinessCardHTML(data: any): string {
    // Generate HTML for business card preview
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .card { width: 350px; height: 200px; border: 1px solid #ddd; padding: 20px; }
            .name { font-size: 18px; font-weight: bold; }
            .company { color: #666; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="name">${data.front?.name || "No Name"}</div>
            <div class="company">${data.front?.company || ""}</div>
            <div>${data.front?.email || ""}</div>
            <div>${data.front?.phone || ""}</div>
          </div>
        </body>
      </html>
    `;
  }

  private generateInvoiceHTML(invoice: any): string {
    // Generate HTML for invoice preview
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .total { font-size: 20px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <h1>Invoice #${invoice.invoiceNumber}</h1>
              <p>Date: ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="total">
              Total: ${invoice.currency} ${invoice.total}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async uploadToS3(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const key = `exports/${new Date().toISOString().split('T')[0]}/${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });
    
    await this.s3Client.send(command);
    
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  private getFileExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      PNG: 'png',
      JPG: 'jpg',
      JPEG: 'jpg',
      PDF: 'pdf',
      DOCX: 'docx',
      XLSX: 'xlsx',
      CSV: 'csv',
      SVG: 'svg',
      ZIP: 'zip',
      JSON: 'json',
    };
    return extensions[format] || 'bin';
  }

  private getMimeType(format: ExportFormat): string {
    const mimeTypes: Record<ExportFormat, string> = {
      PNG: 'image/png',
      JPG: 'image/jpeg',
      JPEG: 'image/jpeg',
      PDF: 'application/pdf',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv',
      SVG: 'image/svg+xml',
      ZIP: 'application/zip',
      JSON: 'application/json',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  private async cleanupOldExports(userId: string) {
    // Get user's export settings
    const settings = await prisma.exportSetting.findUnique({
      where: { userId },
    });

    const daysToKeep = settings?.autoExpireDays || 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - daysToKeep);

    // Find old exports
    const oldExports = await prisma.export.findMany({
      where: {
        userId,
        createdAt: { lt: expiryDate },
        status: "COMPLETED",
      },
    });

    // Delete files from S3 and update records
    for (const exportRecord of oldExports) {
      try {
        // Extract key from URL
        const url = new URL(exportRecord.fileUrl);
        const key = url.pathname.substring(1);
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        
        await this.s3Client.send(deleteCommand);
        
        await prisma.export.update({
          where: { id: exportRecord.id },
          data: { status: "DELETED", fileUrl: null as any },
        });
      } catch (error) {
        console.error(`Failed to delete export ${exportRecord.id}:`, error);
      }
    }
  }

  async getExport(exportId: string) {
    return await prisma.export.findUnique({
      where: { id: exportId },
    });
  }

  async getUserExports(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [exports, total] = await Promise.all([
      prisma.export.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.export.count({ where: { userId } }),
    ]);
    
    return { exports, total, page, totalPages: Math.ceil(total / limit) };
  }

  async deleteExport(exportId: string, userId: string) {
    const exportRecord = await prisma.export.findFirst({
      where: { id: exportId, userId },
    });
    
    if (!exportRecord) {
      throw new Error("Export not found");
    }
    
    // Delete from S3 if file exists
    if (exportRecord.fileUrl) {
      try {
        const url = new URL(exportRecord.fileUrl);
        const key = url.pathname.substring(1);
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        
        await this.s3Client.send(deleteCommand);
      } catch (error) {
        console.error(`Failed to delete S3 file for export ${exportId}:`, error);
      }
    }
    
    await prisma.export.delete({
      where: { id: exportId },
    });
    
    return { success: true };
  }
}