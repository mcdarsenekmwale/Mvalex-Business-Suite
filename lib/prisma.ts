// import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PrismaClient instance with custom configuration
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn", "info"] 
      : ["error"],
    errorFormat: "pretty",
    adapter,
  });

  // Add connection event handlers (only for supported events)
  client.$on("query" as never, (e: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log("Query:", e.query);
      console.log("Params:", e.params);
      console.log("Duration:", e.duration, "ms");
    }
  });

  client.$on("error" as never, (e: any) => {
    console.error("Prisma Client error:", e.message);
  });

  client.$on("warn" as never, (e: any) => {
    if (process.env.NODE_ENV === "development") {
      console.warn("Prisma Client warning:", e.message);
    }
  });

  return client;
};

// Singleton pattern for PrismaClient
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Auto-connect in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  
  // Connect immediately in development
  prisma.$connect()
    .then(() => {
      console.log("✅ Database connected successfully");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error);
    });
}

// Graceful shutdown handling using process events
const handleShutdown = async (signal: string) => {
  console.log(`${signal} received. Closing database connections...`);
  try {
    await prisma.$disconnect();
    console.log("Database disconnected successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during database disconnect:", error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Optional: Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  handleShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  handleShutdown("UNHANDLED_REJECTION");
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;