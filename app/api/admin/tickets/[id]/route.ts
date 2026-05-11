import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/permissions";
import { getTicketById } from "@/lib/admin/queries";

function checkAdminAuth(session: any) {
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

// GET /api/admin/tickets/[id] - Get ticket details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { id } = await params;
    const ticket = await getTicketById(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Admin ticket GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tickets/[id] - Update ticket (assign, status)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = checkAdminAuth(session);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo || null;
    if (body.priority) updateData.priority = body.priority;
    if (body.status === "RESOLVED") updateData.resolvedAt = new Date();

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin ticket PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
