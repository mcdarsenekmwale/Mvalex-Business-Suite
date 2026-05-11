import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/notification.service";
import { getRedis } from "@/lib/redis";

export type AgentStatus =
  | "ONLINE"
  | "BUSY"
  | "AWAY"
  | "OFFLINE"
  | "IN_MEETING"
  | "ON_BREAK"
  | "TRAINING";

type AgentAvailabilityRow = {
  userId: string;
  status: AgentStatus;
  capacity: number;
  currentLoad: number;
  lastActiveAt: Date;
  manualOverride: boolean;
};

/**
 * Agent availability and workforce management service.
 * Includes auto-status monitoring, shift scheduling, workload forecasting,
 * performance metrics, and smart ticket routing.
 */
export class AgentAvailabilityService {
  private static readonly AWAY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly BREAK_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
  private static monitorIntervalId: ReturnType<typeof setInterval> | null = null;

  // --- Status Management ---

  static async updateStatus(userId: string, status: AgentStatus, reason?: string): Promise<void> {
    const oldStatus = await this.getAgentStatus(userId);

    await prisma.agentAvailability.upsert({
      where: { userId },
      create: {
        userId,
        status: status as any,
        capacity: 5,
        currentLoad: 0,
        lastActiveAt: new Date(),
        manualOverride: Boolean(reason),
        overrideReason: reason ?? null,
      },
      update: {
        status: status as any,
        lastActiveAt: new Date(),
        manualOverride: Boolean(reason),
        overrideReason: reason ?? null,
      },
    });

    if (oldStatus !== status) {
      const admins = await prisma.user.findMany({
        where: {
          roles: { some: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } } },
        },
        select: { id: true },
      });

      await NotificationService.broadcast(
        admins.map((a) => a.id),
        "Agent Status Changed",
        `Agent ${userId} moved from ${oldStatus} to ${status}${reason ? ` (${reason})` : ""}.`,
        "AGENT_STATUS_CHANGE",
        { userId, oldStatus, newStatus: status }
      );
    }
  }

  static async getAgentStatus(userId: string): Promise<AgentStatus> {
    const row = await prisma.agentAvailability.findUnique({
      where: { userId },
      select: { status: true },
    });
    return (row?.status as AgentStatus) ?? "OFFLINE";
  }

  static async findAvailableAgents(): Promise<AgentAvailabilityRow[]> {
    try {
      const rows = await prisma.agentAvailability.findMany({
        where: {
          status: { in: ["ONLINE", "AWAY"] },
          currentLoad: { lt: prisma.agentAvailability.fields.capacity },
        },
        orderBy: { currentLoad: "asc" },
        select: {
          userId: true,
          status: true,
          capacity: true,
          currentLoad: true,
          lastActiveAt: true,
          manualOverride: true,
        },
      });
      return rows as AgentAvailabilityRow[];
    } catch {
      return [];
    }
  }

  // --- Workload ---

  static async incrementWorkload(agentId: string): Promise<void> {
    await prisma.agentAvailability.updateMany({
      where: { userId: agentId },
      data: {
        currentLoad: { increment: 1 },
        lastActiveAt: new Date(),
      },
    });

    const agent = await prisma.agentAvailability.findUnique({
      where: { userId: agentId },
      select: { currentLoad: true, capacity: true, status: true },
    });

    if (agent && agent.currentLoad >= agent.capacity && agent.status === "ONLINE") {
      await this.updateStatus(agentId, "BUSY", "Auto-set due to capacity reached");
    }
  }

  static async decrementWorkload(agentId: string): Promise<void> {
    await prisma.agentAvailability.updateMany({
      where: { userId: agentId },
      data: {
        currentLoad: { decrement: 1 },
        lastActiveAt: new Date(),
      },
    });

    // Ensure currentLoad doesn't go negative
    await prisma.$executeRaw`
      UPDATE "agent_availabilities"
      SET "currentLoad" = GREATEST("currentLoad", 0)
      WHERE "userId" = ${agentId}
    `;

    const agent = await prisma.agentAvailability.findUnique({
      where: { userId: agentId },
      select: { currentLoad: true, capacity: true, status: true, manualOverride: true },
    });

    if (agent && agent.currentLoad < agent.capacity && agent.status === "BUSY" && !agent.manualOverride) {
      await this.updateStatus(agentId, "ONLINE");
    }
  }

  // --- Auto Status Monitor ---

  static startAutoStatusMonitor(): void {
    if (this.monitorIntervalId) return; // Already running

    this.monitorIntervalId = setInterval(async () => {
      try {
        const agents = await prisma.agentAvailability.findMany({
          where: {
            status: { in: ["AWAY", "ON_BREAK"] },
            manualOverride: false,
          },
          select: {
            userId: true,
            status: true,
            lastActiveAt: true,
          },
        });

        for (const agent of agents) {
          const timeSinceActive = Date.now() - agent.lastActiveAt.getTime();

          if (agent.status === "AWAY" && timeSinceActive > this.AWAY_TIMEOUT_MS) {
            await this.updateStatus(agent.userId, "OFFLINE", "Auto-set due to extended inactivity");
          } else if (agent.status === "ON_BREAK" && timeSinceActive > this.BREAK_TIMEOUT_MS) {
            await this.updateStatus(agent.userId, "OFFLINE", "Auto-set due to break timeout");
          }
        }
      } catch (error) {
        console.error("[AgentAvailabilityService] Auto status monitor error:", error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log("[AgentAvailabilityService] Auto status monitor started");
  }

  static stopAutoStatusMonitor(): void {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
      console.log("[AgentAvailabilityService] Auto status monitor stopped");
    }
  }

  // --- Shift Scheduling ---

  static async setShift(userId: string, shiftStart: Date, shiftEnd: Date): Promise<void> {
    await prisma.agentAvailability.update({
      where: { userId },
      data: { shiftStart, shiftEnd },
    });

    const now = new Date();
    if (now >= shiftStart && now <= shiftEnd) {
      await this.updateStatus(userId, "ONLINE", "Shift started");
    }

    // Schedule shift start reminder (30 min before)
    const timeToStart = shiftStart.getTime() - now.getTime();
    if (timeToStart > 0 && timeToStart < 24 * 60 * 60 * 1000) {
      const reminderDelay = timeToStart - 30 * 60 * 1000;
      if (reminderDelay > 0) {
        setTimeout(async () => {
          await NotificationService.send({
            userId,
            title: "Shift Starting Soon",
            message: "Your shift starts in 30 minutes. Please log in.",
            type: "SYSTEM_ALERT",
          });
        }, reminderDelay);
      }
    }
  }

  // --- Workload Forecasting ---

  static async predictWorkload(hours = 24): Promise<Array<{ hour: number; predicted: number }>> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const assignments = await prisma.ticketAssignment.findMany({
      where: { assignedAt: { gte: since } },
      select: { assignedAt: true },
    });

    const hourlyCounts = new Array(24).fill(0);
    for (const assignment of assignments) {
      const hour = new Date(assignment.assignedAt).getHours();
      hourlyCounts[hour]++;
    }

    const predictions = [];
    for (let i = 0; i < hours; i++) {
      const futureHour = (new Date().getHours() + i) % 24;
      predictions.push({
        hour: futureHour,
        predicted: Math.round(hourlyCounts[futureHour] / 30),
      });
    }

    return predictions;
  }

  // --- Performance Metrics ---

  static async recordPerformance(
    agentId: string,
    metrics: {
      ticketsResolved?: number;
      avgResponseTime?: number;
      satisfactionRate?: number;
      workTime?: number;
    }
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.agentPerformance.upsert({
      where: { agentId_date: { agentId, date: today } },
      update: {
        ticketsResolved: { increment: metrics.ticketsResolved || 0 },
        avgResponseTime: metrics.avgResponseTime,
        satisfactionRate: metrics.satisfactionRate,
        totalWorkTime: { increment: metrics.workTime || 0 },
      },
      create: {
        agentId,
        date: today,
        ticketsResolved: metrics.ticketsResolved || 0,
        avgResponseTime: metrics.avgResponseTime || 0,
        satisfactionRate: metrics.satisfactionRate || 0,
        totalWorkTime: metrics.workTime || 0,
      },
    });
  }

  static async getAgentPerformance(agentId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return prisma.agentPerformance.findMany({
      where: { agentId, date: { gte: since } },
      orderBy: { date: "desc" },
    });
  }

  // --- Smart Routing ---

  static async findBestAgentForTicket(
    ticketPriority: string,
    _ticketCategory?: string
  ): Promise<string | null> {
    const availableAgents = await this.findAvailableAgents();
    if (availableAgents.length === 0) return null;

    const scoredAgents = await Promise.all(
      availableAgents.map(async (agent) => {
        let score = 100 - (agent.currentLoad / agent.capacity) * 100;

        // Bonus for URGENT tickets: prefer agents with fast response times
        if (ticketPriority === "URGENT") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const performance = await prisma.agentPerformance.findFirst({
            where: { agentId: agent.userId, date: today },
            select: { avgResponseTime: true },
          });
          if (performance && performance.avgResponseTime > 0 && performance.avgResponseTime < 30) {
            score += 20;
          }
        }

        return { agentId: agent.userId, score };
      })
    );

    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.agentId || null;
  }

  // --- Dashboard ---

  static async getAgentDashboard() {
    const agents = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ["AGENT", "SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"] },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        supportTickets: {
          where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
          select: { id: true, status: true, priority: true },
        },
      },
    });

    const availabilityRows = await prisma.agentAvailability.findMany({
      select: {
        userId: true,
        status: true,
        capacity: true,
        currentLoad: true,
        lastActiveAt: true,
      },
    });

    const availabilityByUserId = new Map(availabilityRows.map((r) => [r.userId, r]));
    const withAvailability = agents.map((agent) => ({
      ...agent,
      availability: availabilityByUserId.get(agent.id) ?? null,
      assignedTickets: agent.supportTickets,
    }));

    const totalAssignedTickets = withAvailability.reduce(
      (sum, a) => sum + (a.availability?.currentLoad ?? a.assignedTickets.length),
      0
    );

    return {
      agents: withAvailability,
      stats: {
        totalAgents: withAvailability.length,
        onlineAgents: withAvailability.filter((a) => a.availability?.status === "ONLINE").length,
        busyAgents: withAvailability.filter((a) => a.availability?.status === "BUSY").length,
        awayAgents: withAvailability.filter((a) => a.availability?.status === "AWAY").length,
        offlineAgents: withAvailability.filter((a) => !a.availability || a.availability.status === "OFFLINE").length,
        totalAssignedTickets,
        averageLoad: totalAssignedTickets / Math.max(withAvailability.length, 1),
      },
    };
  }
}
