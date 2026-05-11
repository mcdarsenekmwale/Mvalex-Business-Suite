import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/notification.service";
import { AgentAvailabilityService } from "@/lib/agents/agent-availability.service";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";
import { NotificationCache } from "@/lib/cache/notification-cache";

// Simple test runner
let passCount = 0;
let failCount = 0;

async function assert(condition: boolean, message: string) {
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
  } else {
    failCount++;
    console.error(`  ❌ ${message}`);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n🧪 ${name}`);
  try {
    await fn();
  } catch (error) {
    failCount++;
    console.error(`  ❌ Test threw:`, error);
  }
}

// Helpers
async function createTestUser(data?: { name?: string; email?: string; role?: string }) {
  const email = data?.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  return prisma.user.create({
    data: {
      email,
      name: data?.name ?? "Test User",
      passwordHash: "hashed",
      status: "ACTIVE",
      roles: data?.role
        ? {
            create: {
              role: {
                connectOrCreate: {
                  where: { name: data.role },
                  create: { name: data.role, type: data.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : data.role === "ADMIN" ? "ADMIN" : "USER" },
                },
              },
            },
          }
        : undefined,
    },
  });
}

async function createTestAgent(status: string, currentLoad = 0, capacity = 5) {
  const user = await createTestUser({ name: "Agent", role: "SUPPORT_AGENT" });
  await prisma.agentAvailability.create({
    data: {
      userId: user.id,
      status: status as any,
      currentLoad,
      capacity,
    },
  });
  return user;
}

async function createTestTicket(data?: { priority?: string; assignedTo?: string | null; userId?: string }) {
  const userId = data?.userId ?? (await createTestUser()).id;
  return prisma.supportTicket.create({
    data: {
      userId,
      subject: "Test Ticket",
      description: "Test description",
      priority: (data?.priority as any) ?? "MEDIUM",
      assignedTo: data?.assignedTo === undefined ? undefined : data.assignedTo,
    },
  });
}

async function cleanup() {
  // Clean up test data in reverse order of dependencies
  await prisma.notificationQueue.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.agentPerformance.deleteMany({});
  await prisma.ticketAssignment.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.agentAvailability.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: "@example.com" } },
    select: { id: true },
  });
  for (const u of testUsers) {
    await prisma.userRole.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
}

async function seedTemplates() {
  const templates = [
    { name: "ticket_created", type: "TICKET_CREATED", title: "Ticket Created", message: "Hi {{userName}}, your ticket \"{{ticketSubject}}\" has been created." },
    { name: "ticket_responded", type: "TICKET_RESPONDED", title: "New Response", message: "Your ticket \"{{ticketSubject}}\" has a new response." },
    { name: "ticket_assigned_to_agent", type: "TICKET_ASSIGNED", title: "Ticket Assigned", message: "Ticket \"{{ticketSubject}}\" assigned to you." },
    { name: "agent_assigned", type: "TICKET_ASSIGNED", title: "Agent Assigned", message: "A support agent is now handling your ticket." },
    { name: "ticket_resolved", type: "TICKET_RESOLVED", title: "Ticket Resolved", message: "Your ticket \"{{ticketSubject}}\" is now resolved." },
    { name: "ticket_closed", type: "TICKET_RESOLVED", title: "Ticket Closed", message: "Your ticket \"{{ticketSubject}}\" is now closed." },
    { name: "ticket_updated", type: "TICKET_RESPONDED", title: "Ticket Updated", message: "Your ticket \"{{ticketSubject}}\" has been updated." },
    { name: "customer_responded", type: "TICKET_RESPONDED", title: "Customer Responded", message: "{{customerName}} responded to \"{{ticketSubject}}\"." },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { name: t.name },
      update: {},
      create: t as any,
    });
  }
}

async function main() {
  console.log("🔬 Running Notification System Tests...\n");

  await cleanup();
  await seedTemplates();

  await test("Should send notification when ticket created", async () => {
    const user = await createTestUser();
    const ticket = await createTestTicket({ userId: user.id });

    await TicketEventListeners.onTicketCreated(ticket.id);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, type: "TICKET_CREATED" },
    });

    await assert(notifications.length > 0, `Expected notifications > 0, got ${notifications.length}`);
  });

  await test("Should auto-assign urgent ticket to available agent", async () => {
    const agent = await createTestAgent("ONLINE", 0, 5);
    const ticket = await createTestTicket({ priority: "URGENT" });

    await TicketEventListeners.onTicketCreated(ticket.id);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const updatedTicket = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
    });

    await assert(updatedTicket?.assignedTo === agent.id, `Expected assigned to ${agent.id}, got ${updatedTicket?.assignedTo}`);
  });

  await test("Should respect user notification preferences", async () => {
    const user = await createTestUser();
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        type: "TICKET_RESPONDED",
        channel: "EMAIL",
        enabled: false,
      },
    });

    const filtered = await (NotificationService as any).filterChannelsByPreferences(
      user.id,
      "TICKET_RESPONDED",
      ["IN_APP", "EMAIL"]
    );

    await assert(!filtered.includes("EMAIL"), "EMAIL should be filtered out");
    await assert(filtered.includes("IN_APP"), "IN_APP should remain");
  });

  await test("Should cache and invalidate notifications", async () => {
    const user = await createTestUser();
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Test",
        message: "Message",
        type: "SYSTEM_ALERT",
        channel: "IN_APP",
      },
    });

    const first = await NotificationCache.getUserNotifications(user.id, 1, 20);
    await assert(first.notifications.length > 0, "Should have notifications");

    await NotificationCache.invalidateUserCache(user.id);
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Test 2",
        message: "Message 2",
        type: "SYSTEM_ALERT",
        channel: "IN_APP",
      },
    });

    const second = await NotificationCache.getUserNotifications(user.id, 1, 20);
    await assert(second.notifications.length === first.notifications.length + 1, "Cache should be invalidated");
  });

  await test("Should send bulk notifications with results map", async () => {
    const users = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const results = await NotificationService.sendBulk(
      users.map((u) => u.id),
      {
        title: "Bulk Test",
        message: "Hello bulk",
        type: "SYSTEM_ALERT",
      }
    );

    await assert(results.size === 3, `Expected 3 results, got ${results.size}`);
    for (const [, success] of results) {
      await assert(success === true, "All bulk sends should succeed");
    }
  });

  await test("Should cleanup old read notifications", async () => {
    const user = await createTestUser();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Old",
        message: "Old message",
        type: "SYSTEM_ALERT",
        channel: "IN_APP",
        isRead: true,
        createdAt: oldDate,
      },
    });

    const deleted = await NotificationService.cleanupOldNotifications(90);
    await assert(deleted >= 1, `Expected >= 1 deleted, got ${deleted}`);
  });

  await test("Should record agent performance on ticket resolution", async () => {
    const agent = await createTestAgent("BUSY", 1, 5);
    const ticket = await createTestTicket({ assignedTo: agent.id });

    await TicketEventListeners.onTicketStatusChange(ticket.id, "IN_PROGRESS", "RESOLVED");
    await new Promise((resolve) => setTimeout(resolve, 300));

    const perf = await prisma.agentPerformance.findFirst({
      where: { agentId: agent.id },
      orderBy: { date: "desc" },
    });

    await assert(perf !== null, "Performance record should exist");
    await assert((perf?.ticketsResolved ?? 0) >= 1, `Expected ticketsResolved >= 1, got ${perf?.ticketsResolved}`);
  });

  await test("Should find best agent for urgent ticket", async () => {
    const agent1 = await createTestAgent("ONLINE", 3, 5);
    const agent2 = await createTestAgent("ONLINE", 0, 5);

    const bestId = await AgentAvailabilityService.findBestAgentForTicket("URGENT");
    await assert(bestId === agent2.id, `Expected best agent ${agent2.id}, got ${bestId}`);
  });

  // Cleanup
  await cleanup();

  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
