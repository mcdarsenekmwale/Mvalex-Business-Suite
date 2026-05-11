// app/api/health/status/route.ts (improved version)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DatabaseManager } from "@/lib/db-utils";

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Use DatabaseManager for robust health check
    const dbHealth = await DatabaseManager.healthCheck();
    
    // Get active users count if database is connected
    let activeUsers = 0;
    let lastBackupTime = null;
    
    if (dbHealth.connected) {
      try {
        // Use executeWithRetry for database operations
        activeUsers = await DatabaseManager.executeWithRetry(async () => {
          // Check if session table exists
          const tableCheck = await prisma.$queryRaw`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = 'Session'
            ) as exists
          `;
          
          const sessionTableExists = Array.isArray(tableCheck) && tableCheck[0]?.exists === true;
          
          if (sessionTableExists) {
            return await prisma.session.count({
              where: {
                expires: { gt: new Date() },
              },
            });
          } else {
            // Fallback: count users updated in last 30 minutes
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            return await prisma.user.count({
              where: {
                updatedAt: { gte: thirtyMinutesAgo },
              },
            });
          }
        }, 2);
      } catch (error) {
        console.error("Failed to get active users count:", error);
        activeUsers = 0;
      }
      
      // Get last backup time from environment or database
      try {
        const backupRecord = await DatabaseManager.executeWithRetry(async () => {
          // You would have a Backup model in your schema
          // For now, use environment variable
          return process.env.LAST_BACKUP_TIME;
        }, 1);
        lastBackupTime = backupRecord || new Date().toISOString();
      } catch (error) {
        lastBackupTime = process.env.LAST_BACKUP_TIME || new Date().toISOString();
      }
    }

    const healthData = {
      status: dbHealth.connected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: dbHealth.connected ? "connected" : "error",
          latency: dbHealth.latency,
          error: dbHealth.error,
        },
        api: {
          status: "ok",
          responseTime: Date.now() - startTime,
        },
      },
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      lastBackupTime,
      apiResponseTime: Date.now() - startTime,
      activeUsers,
    };

    const httpStatus = dbHealth.connected ? 200 : 503;
    
    return NextResponse.json(healthData, { status: httpStatus });
  } catch (error) {
    console.error("Health check failed:", error);
    
    // Attempt to reconnect database
    await DatabaseManager.reconnect();
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: {
            status: "error",
            error: error instanceof Error ? error.message : "Database connection failed",
          },
          api: {
            status: "error",
            responseTime: Date.now() - startTime,
          },
        },
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        apiResponseTime: Date.now() - startTime,
        activeUsers: 0,
        lastBackupTime: process.env.LAST_BACKUP_TIME || null,
      },
      { status: 503 }
    );
  }
}
