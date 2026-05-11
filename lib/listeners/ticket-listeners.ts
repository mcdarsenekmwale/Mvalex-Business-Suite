import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { NotificationService } from "@/lib/notifications/notification.service";
import { AgentAvailabilityService } from "@/lib/agents/agent-availability.service";

/**
 * Ticket event listeners with idempotency, SLA monitoring,
 * smart routing, dead letter queue, and analytics tracking.
 */
export class TicketEventListeners {
  // In-memory dedup set (cleared every hour to prevent unbounded growth)
  private static processedEvents = new Set<string>();

  static async onTicketCreated(ticketId: string): Promise<void> {
    const eventKey = `ticket:created:${ticketId}`;
    if (this.processedEvents.has(eventKey)) {
      console.log(`[TicketEventListeners] Duplicate event detected: ${eventKey}`);
      return;
    }
    this.processedEvents.add(eventKey);

    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { user: true },
      });
      if (!ticket) return;

      // Send using template if available
      await NotificationService.sendFromTemplate(
        ticket.userId,
        "ticket_created",
        {
          userName: ticket.user?.name || "User",
          ticketSubject: ticket.subject,
          ticketId: ticket.id,
        },
        { ticketId, href: "/support/tickets" }
      );

      // Track analytics
      await this.trackMetric("ticket_created", ticket.priority);

      // Smart agent assignment
      let assigned = false;

      if (ticket.priority === "URGENT") {
        const bestAgentId = await AgentAvailabilityService.findBestAgentForTicket(
          ticket.priority,
          ticket.category ?? undefined
        );
        if (bestAgentId) {
          await this.assignTicketToAgent(ticketId, bestAgentId, "AUTO");
          assigned = true;
        }
      }

      if (!assigned) {
        const availableAgents = await AgentAvailabilityService.findAvailableAgents();
        if (availableAgents.length > 0) {
          const bestAgent = availableAgents.sort((a, b) => a.currentLoad - b.currentLoad)[0];
          await this.assignTicketToAgent(ticketId, bestAgent.userId, "AUTO");
          assigned = true;
        }
      }

      if (!assigned) {
        await this.notifyUnassigned(ticket.id, ticket.subject, ticket.priority);
        await this.scheduleEscalation(ticketId);
      }

      // Start SLA monitoring
      await this.monitorSLA(ticketId);
    } catch (error) {
      console.error(`[TicketEventListeners] Failed to process ticket creation for ${ticketId}:`, error);
      await this.addToDeadLetterQueue("ticket_created", ticketId, error);
    } finally {
      setTimeout(() => this.processedEvents.delete(eventKey), 3600000);
    }
  }

  static async onTicketResponse(
    ticketId: string,
    responseId: string,
    isStaffResponse: boolean
  ): Promise<void> {
    const eventKey = `ticket:response:${ticketId}:${responseId}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);

    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { user: true },
      });
      if (!ticket) return;

      if (isStaffResponse) {
        await NotificationService.sendFromTemplate(
          ticket.userId,
          "ticket_responded",
          {
            userName: ticket.user?.name || "User",
            ticketSubject: ticket.subject,
            ticketId: ticket.id,
          },
          { ticketId, responseId, href: `/support/tickets?ticket=${ticketId}` }
        );
        return;
      }

      if (ticket.assignedTo) {
        await NotificationService.sendFromTemplate(
          ticket.assignedTo,
          "customer_responded",
          {
            customerName: ticket.user?.name || "Customer",
            ticketSubject: ticket.subject,
            ticketId: ticket.id,
          },
          { ticketId, responseId, href: `/admin/tickets?ticket=${ticketId}` }
        );
        return;
      }

      await this.notifyUnassigned(ticket.id, ticket.subject, ticket.priority);
    } catch (error) {
      console.error(`[TicketEventListeners] Failed to process ticket response for ${ticketId}:`, error);
      await this.addToDeadLetterQueue("ticket_response", ticketId, error);
    } finally {
      setTimeout(() => this.processedEvents.delete(eventKey), 3600000);
    }
  }

  static async onTicketAssigned(ticketId: string, agentId: string, assignedBy: string): Promise<void> {
    const eventKey = `ticket:assigned:${ticketId}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);

    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { user: true },
      });
      if (!ticket) return;

      await NotificationService.sendFromTemplate(
        agentId,
        "ticket_assigned_to_agent",
        {
          ticketSubject: ticket.subject,
          ticketId: ticket.id,
        },
        { ticketId, assignedBy, href: `/admin/tickets?ticket=${ticketId}` }
      );

      await NotificationService.sendFromTemplate(
        ticket.userId,
        "agent_assigned",
        {
          ticketSubject: ticket.subject,
          ticketId: ticket.id,
        },
        { ticketId, agentId, href: `/support/tickets?ticket=${ticketId}` }
      );

      await AgentAvailabilityService.incrementWorkload(agentId);
    } catch (error) {
      console.error(`[TicketEventListeners] Failed to process ticket assignment for ${ticketId}:`, error);
      await this.addToDeadLetterQueue("ticket_assigned", ticketId, error);
    } finally {
      setTimeout(() => this.processedEvents.delete(eventKey), 3600000);
    }
  }

  static async onTicketStatusChange(ticketId: string, oldStatus: string, newStatus: string): Promise<void> {
    const eventKey = `ticket:status:${ticketId}:${newStatus}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);

    try {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) return;

      const templateName =
        newStatus === "RESOLVED"
          ? "ticket_resolved"
          : newStatus === "CLOSED"
            ? "ticket_closed"
            : "ticket_updated";

      await NotificationService.sendFromTemplate(
        ticket.userId,
        templateName,
        {
          ticketSubject: ticket.subject,
          ticketId: ticket.id,
          status: newStatus,
        },
        { ticketId, oldStatus, newStatus, href: `/support/tickets?ticket=${ticketId}` }
      );

      if (ticket.assignedTo && (newStatus === "RESOLVED" || newStatus === "CLOSED")) {
        await AgentAvailabilityService.decrementWorkload(ticket.assignedTo);

        // Record performance metric
        const responseTimeMinutes = Math.round(
          (Date.now() - new Date(ticket.createdAt).getTime()) / 60000
        );
        await AgentAvailabilityService.recordPerformance(ticket.assignedTo, {
          ticketsResolved: 1,
          avgResponseTime: responseTimeMinutes,
        });
      }
    } catch (error) {
      console.error(`[TicketEventListeners] Failed to process status change for ${ticketId}:`, error);
      await this.addToDeadLetterQueue("ticket_status_change", ticketId, error);
    } finally {
      setTimeout(() => this.processedEvents.delete(eventKey), 3600000);
    }
  }

  static async scheduleEscalationScan(hours = 4): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const staleTickets = await prisma.supportTicket.findMany({
      where: {
        assignedTo: null,
        createdAt: { lte: cutoff },
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      select: { id: true, subject: true, priority: true },
      take: 200,
    });

    for (const ticket of staleTickets) {
      await this.notifyEscalation(ticket.id, ticket.subject);
    }
    return staleTickets.length;
  }

  // --- SLA Monitoring ---

  private static async monitorSLA(ticketId: string): Promise<void> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { priority: true, createdAt: true },
    });
    if (!ticket) return;

    const responseTimeGoalMinutes: Record<string, number> = {
      URGENT: 60,
      HIGH: 240,
      MEDIUM: 720,
      LOW: 1440,
    };

    const goal = responseTimeGoalMinutes[ticket.priority] ?? 1440;
    const deadline = new Date(new Date(ticket.createdAt).getTime() + goal * 60 * 1000);
    const warningTime = deadline.getTime() - 30 * 60 * 1000; // 30 min before

    const now = Date.now();
    if (warningTime > now) {
      const delay = warningTime - now;
      setTimeout(async () => {
        try {
          const current = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            select: { status: true },
          });
          if (current && current.status === "OPEN") {
            await NotificationService.sendToAdmins(
              "⏰ SLA Warning",
              `Ticket ${ticketId} (${ticket.priority}) is approaching SLA deadline.`,
              "TICKET_ESCALATED",
              { ticketId }
            );
          }
        } catch {
          // ignore timer errors
        }
      }, delay);
    }
  }

  // --- Private helpers ---

  private static async assignTicketToAgent(
    ticketId: string,
    agentId: string,
    assignmentType: "AUTO" | "MANUAL"
  ) {
    await prisma.$transaction([
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: { assignedTo: agentId, status: "IN_PROGRESS" },
      }),
      prisma.ticketAssignment.create({
        data: {
          ticketId,
          agentId,
          assignedBy: agentId,
          assignmentType,
        },
      }),
    ]);

    await this.onTicketAssigned(ticketId, agentId, "system");
  }

  private static async notifyUnassigned(ticketId: string, subject: string, priority: string) {
    const admins = await this.getAllAdminIds();
    await NotificationService.broadcast(
      admins,
      "Unassigned Ticket Alert",
      `Ticket "${subject}" (${priority}) is waiting for assignment.`,
      "TICKET_UNASSIGNED",
      { ticketId, priority, href: `/admin/tickets?ticket=${ticketId}` }
    );
  }

  private static async notifyEscalation(ticketId: string, subject: string) {
    const admins = await this.getAllAdminIds();
    await NotificationService.broadcast(
      admins,
      "Unassigned Ticket Escalation",
      `Ticket "${subject}" has remained unassigned for over 4 hours.`,
      "TICKET_ESCALATED",
      { ticketId, href: `/admin/tickets?ticket=${ticketId}` }
    );
  }

  private static async getAllAdminIds(): Promise<string[]> {
    const admins = await prisma.user.findMany({
      where: {
        roles: { some: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } } },
      },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  private static async trackMetric(metric: string, value: string): Promise<void> {
    const redis = await getRedis();
    await redis.zincrby(`metrics:tickets:${metric}`, 1, value);
  }

  private static async addToDeadLetterQueue(event: string, id: string, error: unknown): Promise<void> {
    const redis = await getRedis();
    const entry = JSON.stringify({
      event,
      id,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    await redis.lpush("tickets:dead-letter", entry);
  }

  private static async scheduleEscalation(ticketId: string): Promise<void> {
    // Placeholder: in production, schedule a job via Bull/BullMQ or similar
    // For now, the escalation scan cron handles this.
  }
}
