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

export async function GET(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await prisma.backupSchedule.findMany({
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error fetching backup schedules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      type = "FULL",
      frequency = "DAILY",
      time,
      dayOfWeek,
      dayOfMonth,
      retentionDays = 30,
    } = body;

    if (!name || !time) {
      return NextResponse.json({ error: "Name and time are required" }, { status: 400 });
    }

    const backupType = (type as string).toUpperCase() as BackupType;
    const scheduleFrequency = (frequency as string).toUpperCase() as ScheduleFrequency;

    const nextRunAt = calculateNextRun(scheduleFrequency, time, dayOfWeek, dayOfMonth);

    const schedule = await prisma.backupSchedule.create({
      data: {
        name,
        type: backupType,
        frequency: scheduleFrequency,
        time,
        dayOfWeek,
        dayOfMonth,
        retentionDays,
        nextRunAt,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Error creating backup schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
