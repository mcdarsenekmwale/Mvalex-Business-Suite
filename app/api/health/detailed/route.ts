// app/api/health/detailed/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DatabaseConnection } from "@/lib/db-connection";

interface DetailedHealthCheck {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  checks: {
    database: DatabaseCheck;
    redis?: RedisCheck;
    storage?: StorageCheck;
    memory: MemoryCheck;
    disk?: DiskCheck;
  };
  diagnostics: {
    databaseSize?: string;
    activeConnections?: number;
    slowQueries?: number;
  };
}

interface DatabaseCheck {
  status: "connected" | "error";
  latency_ms: number;
  version?: string;
  maxConnections?: number;
  activeConnections?: number;
  error?: string;
}

interface RedisCheck {
  status: "connected" | "error";
  latency_ms: number;
  memory_usage_mb?: number;
  error?: string;
}

interface StorageCheck {
  status: "connected" | "error";
  latency_ms: number;
  buckets?: string[];
  error?: string;
}

interface MemoryCheck {
  status: "ok" | "warning" | "critical";
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  usagePercent: number;
}

interface DiskCheck {
  status: "ok" | "warning" | "critical";
  freeMB: number;
  totalMB: number;
  usagePercent: number;
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const detailedHealth: DetailedHealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: "error",
        latency_ms: 0,
      },
      memory: {
        status: "ok",
        heapUsedMB: 0,
        heapTotalMB: 0,
        rssMB: 0,
        usagePercent: 0,
      },
    },
    diagnostics: {},
  };

  // Check Database with proper connection handling
  const dbStartTime = Date.now();
  try {
    // Use DatabaseConnection utility
    await DatabaseConnection.ensureConnection();
    
    // Get database version and stats with error handling
    let dbVersion = "Unknown";
    let activeConnections = 0;
    
    try {
      const dbInfo = await prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version() as version
      `;
      dbVersion = dbInfo[0]?.version?.split(",")[0] || "Unknown";
    } catch (versionError) {
      console.error("Failed to get database version:", versionError);
    }
    
    try {
      // Try to get active connections (PostgreSQL specific)
      const dbStats = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT count(*) as count FROM pg_stat_activity
      `;
      activeConnections = parseInt(dbStats[0]?.count?.toString() || "0");
    } catch (statsError) {
      console.error("Failed to get connection stats:", statsError);
      // Try alternative query for MySQL if needed
      try {
        const dbStats = await prisma.$queryRaw<Array<{ count: string }>>`
          SHOW STATUS LIKE 'Threads_connected'
        `;
        activeConnections = parseInt(dbStats[0]?.count?.toString() || "0");
      } catch (mysqlError) {
        // Ignore - connections stats not available
      }
    }
    
    detailedHealth.checks.database = {
      status: "connected",
      latency_ms: Date.now() - dbStartTime,
      version: dbVersion,
      activeConnections: activeConnections,
    };
    
    // Don't disconnect immediately - keep connection for other checks
  } catch (error) {
    detailedHealth.checks.database.status = "error";
    detailedHealth.checks.database.error = error instanceof Error ? error.message : "Database connection failed";
    detailedHealth.checks.database.latency_ms = Date.now() - dbStartTime;
    detailedHealth.status = "unhealthy";
  }

  // Check Redis if configured
  if (process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL) {
    const redisStartTime = Date.now();
    try {
      // Dynamic import to avoid loading Redis if not used
      const { Redis } = await import("@upstash/redis");
      const redis = Redis.fromEnv();
      const pong = await redis.ping();
      
      detailedHealth.checks.redis = {
        status: pong === "PONG" ? "connected" : "error",
        latency_ms: Date.now() - redisStartTime,
      };
      
      if (detailedHealth.checks.redis.status === "error") {
        detailedHealth.status = "degraded";
      }
    } catch (error) {
      detailedHealth.checks.redis = {
        status: "error",
        latency_ms: Date.now() - redisStartTime,
        error: error instanceof Error ? error.message : "Redis connection failed",
      };
      detailedHealth.status = "degraded";
    }
  }

  // Check S3 Storage if configured
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const storageStartTime = Date.now();
    try {
      const { S3Client, ListBucketsCommand } = await import("@aws-sdk/client-s3");
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        requestHandler: {
          connectionTimeout: 5000,
        } as any,
      });
      
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
      detailedHealth.checks.storage = {
        status: "connected",
        latency_ms: Date.now() - storageStartTime,
        buckets: response.Buckets?.map((b) => b.Name || "").filter(Boolean) || [],
      };
    } catch (error) {
      detailedHealth.checks.storage = {
        status: "error",
        latency_ms: Date.now() - storageStartTime,
        error: error instanceof Error ? error.message : "Storage connection failed",
      };
      detailedHealth.status = "degraded";
    }
  }

  // Check Memory usage
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
  const usagePercent = heapTotalMB > 0 ? (heapUsedMB / heapTotalMB) * 100 : 0;
  
  detailedHealth.checks.memory = {
    status: usagePercent > 90 ? "critical" : usagePercent > 75 ? "warning" : "ok",
    heapUsedMB,
    heapTotalMB,
    rssMB,
    usagePercent: Math.round(usagePercent),
  };
  
  if (usagePercent > 90) {
    detailedHealth.status = "degraded";
  }

  // Optional: Check disk space (if running on server with fs access)
  if (process.env.NODE_ENV === "production") {
    try {
      const diskCheckSpace = await import("check-disk-space");
      const diskSpace = await diskCheckSpace.default("/");
      const freeMB = Math.round(diskSpace.free / 1024 / 1024);
      const totalMB = Math.round(diskSpace.size / 1024 / 1024);
      const diskUsagePercent = ((totalMB - freeMB) / totalMB) * 100;
      
      detailedHealth.checks.disk = {
        status: diskUsagePercent > 90 ? "critical" : diskUsagePercent > 80 ? "warning" : "ok",
        freeMB,
        totalMB,
        usagePercent: Math.round(diskUsagePercent),
      };
      
      if (diskUsagePercent > 95) {
        detailedHealth.status = "degraded";
      }
    } catch (diskError) {
      // Disk check not available in serverless environments
      console.debug("Disk space check not available");
    }
  }

  // Set overall status based on all checks
  if (detailedHealth.checks.database.status === "error") {
    detailedHealth.status = "unhealthy";
  } else if (detailedHealth.status === "healthy" && 
             (detailedHealth.checks.memory.status === "warning" || 
              detailedHealth.checks.memory.status === "critical" ||
              detailedHealth.checks.redis?.status === "error" ||
              detailedHealth.checks.storage?.status === "error" ||
              detailedHealth.checks.disk?.status === "warning")) {
    detailedHealth.status = "degraded";
  }

  // Add diagnostic info
  try {
    // Get database size (PostgreSQL)
    const dbSize = await prisma.$queryRaw<Array<{ size: string }>>`
      SELECT pg_database_size(current_database()) as size
    `;
    const sizeBytes = parseInt(dbSize[0]?.size || "0");
    detailedHealth.diagnostics.databaseSize = `${Math.round(sizeBytes / 1024 / 1024)} MB`;
  } catch (error) {
    // Database size not available
  }

  // Determine HTTP status code
  let httpStatus = 200;
  if (detailedHealth.status === "unhealthy") httpStatus = 503;
  if (detailedHealth.status === "degraded") httpStatus = 200; // Still OK but with warnings

  // Add response time to API check
  const totalResponseTime = Date.now() - startTime;
  
  return NextResponse.json({
    ...detailedHealth,
    responseTime: totalResponseTime,
  } as any, { status: httpStatus });
}