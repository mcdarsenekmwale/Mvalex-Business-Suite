import  {PrismaClient}  from "@/generated/prisma/client";

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function validateSchema() {
  console.log("🔍 Validating Backup System Schema...\n");

  const requiredTables = ["Backup", "BackupRestore", "BackupSchedule", "BackupLog"];
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

  console.log("\n📋 Checking enums...");
  const enums = ["BackupType", "BackupStatus", "StorageType", "RestoreStatus", "ScheduleFrequency", "LogLevel"];
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

  console.log("\n🎉 Backup schema validation complete.");
  if (!allOk) {
    console.log("⚠️ Some issues were found. Please run `npx prisma migrate dev` if tables are missing.");
    process.exit(1);
  }
}

validateSchema().catch((error) => {
  console.error("Validation failed:", error);
  process.exit(1);
});
