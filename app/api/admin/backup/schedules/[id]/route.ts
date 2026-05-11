import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { BackupType, ScheduleFrequency } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user?.role as any)) {
    return null;
  }
  return session;
}

function calculateNextRun(
  frequency: ScheduleFrequency,
  time: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  if (frequency === ScheduleFrequency.DAILY) {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (frequency === ScheduleFrequency.WEEKLY) {
    const targetDay = dayOfWeek ?? 0;
    const daysToAdd = (targetDay - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + daysToAdd);
    if (next <= now) next.setDate(next.getDate() + 7);
  } else if (frequency === ScheduleFrequency.MONTHLY) {
    next.setDate(dayOfMonth ?? 1);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  } else {
    if (next <= now) next.setDate(next.getDate() + 1);
  }

  return next;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, type, frequency, time, dayOfWeek, dayOfMonth, retentionDays, isActive } = body;

    const existing = await prisma.backupSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = (type as string).toUpperCase() as BackupType;
    if (frequency !== undefined) updateData.frequency = (frequency as string).toUpperCase() as ScheduleFrequency;
    if (time !== undefined) updateData.time = time;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth;
    if (retentionDays !== undefined) updateData.retentionDays = retentionDays;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Recalculate nextRunAt if relevant fields changed
    if (time !== undefined || frequency !== undefined || dayOfWeek !== undefined || dayOfMonth !== undefined) {
      const newFreq = updateData.frequency ?? existing.frequency;
      const newTime = updateData.time ?? existing.time;
      const newDayOfWeek = updateData.dayOfWeek ?? existing.dayOfWeek;
      const newDayOfMonth = updateData.dayOfMonth ?? existing.dayOfMonth;
      updateData.nextRunAt = calculateNextRun(newFreq, newTime, newDayOfWeek, newDayOfMonth);
    }

    const schedule = await prisma.backupSchedule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Error updating backup schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.backupSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await prisma.backupSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting backup schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
