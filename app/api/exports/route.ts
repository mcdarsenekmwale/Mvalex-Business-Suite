// app/api/exports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ExportService } from "@/lib/services/export.service";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";

const exportService = new ExportService();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const exportId = searchParams.get("id");

    if (exportId) {
      const exportRecord = await exportService.getExport(exportId);
      if (!exportRecord || exportRecord.userId !== session.user.id) {
        return NextResponse.json({ error: "Export not found" }, { status: 404 });
      }
      return NextResponse.json(exportRecord);
    }

    const exports = await exportService.getUserExports(session.user.id, page, limit);
    return NextResponse.json(exports);
  } catch (error) {
    console.error("Error fetching exports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId, assetType, format, options } = await req.json();

    if (!assetId || !assetType || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const exportRecord = await exportService.createExport(
      session.user.id,
      assetId,
      assetType,
      format,
      options
    );

    ActivityLogger.log({
      userId: session.user.id,
      action: "EXPORT_FILE",
      actionType: "EXPORT",
      entityType: "EXPORT",
      entityId: exportRecord.id,
      description: `Exported ${assetType} as ${format}`,
      metadata: { assetType, assetId, format },
    });

    return NextResponse.json(exportRecord, { status: 201 });
  } catch (error) {
    console.error("Error creating export:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const exportId = searchParams.get("id");

    if (!exportId) {
      return NextResponse.json({ error: "Export ID required" }, { status: 400 });
    }

    await exportService.deleteExport(exportId, session.user.id);

    ActivityLogger.log({
      userId: session.user.id,
      action: "DELETE_EXPORT",
      actionType: "DELETE",
      entityType: "EXPORT",
      entityId: exportId,
      description: "Deleted export",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting export:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}