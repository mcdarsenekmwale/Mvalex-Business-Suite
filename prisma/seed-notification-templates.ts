import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding notification templates...");

  const templates = [
    {
      name: "ticket_created",
      type: "TICKET_CREATED",
      title: "Ticket Created Successfully",
      message: "Hi {{userName}}, your ticket \"{{ticketSubject}}\" has been created. Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "ticket_responded",
      type: "TICKET_RESPONDED",
      title: "New Response on Your Ticket",
      message: "Your ticket \"{{ticketSubject}}\" has a new response. Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "ticket_assigned_to_agent",
      type: "TICKET_ASSIGNED",
      title: "Ticket Assigned to You",
      message: "Ticket \"{{ticketSubject}}\" has been assigned to you. Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "agent_assigned",
      type: "TICKET_ASSIGNED",
      title: "Agent Assigned to Your Ticket",
      message: "A support agent is now handling your ticket \"{{ticketSubject}}\". Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "ticket_resolved",
      type: "TICKET_RESOLVED",
      title: "Ticket Resolved",
      message: "Your ticket \"{{ticketSubject}}\" is now resolved. Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "ticket_closed",
      type: "TICKET_RESOLVED",
      title: "Ticket Closed",
      message: "Your ticket \"{{ticketSubject}}\" is now closed. Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "ticket_updated",
      type: "TICKET_RESPONDED",
      title: "Ticket Updated",
      message: "Your ticket \"{{ticketSubject}}\" has been updated to status: {{status}}. Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "customer_responded",
      type: "TICKET_RESPONDED",
      title: "Customer Responded",
      message: "{{customerName}} responded to \"{{ticketSubject}}\". Reference: {{ticketId}}.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "credit_low",
      type: "CREDIT_LOW",
      title: "Low Credit Balance",
      message: "Your remaining balance is low. Please top up to avoid interruptions.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "credit_added",
      type: "CREDIT_ADDED",
      title: "Credits Added",
      message: "Credits have been added to your account.",
      channels: ["IN_APP", "EMAIL"],
    },
    {
      name: "system_alert",
      type: "SYSTEM_ALERT",
      title: "System Alert",
      message: "{{message}}",
      channels: ["IN_APP", "EMAIL", "SLACK"],
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { name: t.name },
      update: {},
      create: t as any,
    });
  }

  console.log(`✅ Seeded ${templates.length} notification templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
