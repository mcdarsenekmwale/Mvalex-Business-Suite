import  {PrismaClient}  from "@/generated/prisma/client";

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function validateSchema() {
  console.log("🔍 Validating Notification & Agent Schema...\n");

  const requiredTables = [
    "Notification",
    "AgentAvailability",
    "NotificationPreference",
    "NotificationQueue",
    "NotificationTemplate",
    "AgentPerformance",
    "TicketAssignment",
    "SupportTicket",
  ];

  let allOk = true;

  for (const table of requiredTables) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
      console.log(`✅ Table ${table} exists`);
    } catch (error) {
      console.error(`❌ Table ${table} missing or inaccessible — Run migration`);
      allOk = false;
    }
  }

  console.log("\n📊 Checking indexes...");

  const indexChecks = [
    { table: "Notification", indexes: ["Notification_userId_createdAt_idx", "Notification_type_status_idx"] },
    { table: "AgentAvailability", indexes: ["AgentAvailability_status_load_idx", "AgentAvailability_lastActive_idx"] },
    { table: "TicketAssignment", indexes: ["TicketAssignment_agentId_assignedAt_idx"] },
  ];

  for (const check of indexChecks) {
    for (const idx of check.indexes) {
      try {
        const result = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
          `SELECT indexname FROM pg_indexes WHERE tablename = $1 AND indexname = $2`,
          check.table,
          idx
        );
        if ((result as any[]).length > 0) {
          console.log(`✅ Index ${idx} on ${check.table}`);
        } else {
          console.warn(`⚠️ Index ${idx} on ${check.table} not found`);
        }
      } catch {
        console.warn(`⚠️ Could not verify index ${idx} on ${check.table}`);
      }
    }
  }

  console.log("\n📋 Checking enums...");
  const enums = ["NotificationType", "NotificationChannel", "NotificationStatus", "AgentStatus", "QueueStatus"];
  for (const enumName of enums) {
    try {
      await prisma.$queryRawUnsafe(
        `SELECT unnest(enum_range(NULL::"${enumName}"))::text as value`
      );
      console.log(`✅ Enum ${enumName} exists`);
    } catch {
      console.error(`❌ Enum ${enumName} missing`);
      allOk = false;
    }
  }

  console.log("\n🎉 Schema validation complete.");
  if (!allOk) {
    console.log("⚠️ Some issues were found. Please run `npx prisma migrate dev` if tables are missing.");
    process.exit(1);
  }
}

validateSchema().catch((error) => {
  console.error("Validation failed:", error);
  process.exit(1);
});
