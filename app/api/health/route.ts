// app/api/health/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: "connected" | "disconnected" | "error";
      latency?: number;
      error?: string;
    };
    api: {
      status: "ok";
    };
  };
  version: string;
  environment: string;
  verify?: boolean;
}

// Health check route with comprehensive service status
export async function GET(req: Request) {
  const startTime = Date.now();
  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: "disconnected",
      },
      api: {
        status: "ok",
      },
    },
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    verify: true,
  };

  // Test database connection
  try {
    const dbStartTime = Date.now();

    // Attempt to connect and run a simple query
    await prisma.$connect();
    
    // Test query to verify database is responsive
    const result = await prisma.$queryRaw`SELECT 1 as connected, NOW() as current_time`;

    const dbLatency = Date.now() - dbStartTime;
    healthStatus.verify = (result as any).connected === 1;
    
    healthStatus.services.database = {
      status: "connected",
      latency: dbLatency,    
    };
    
    // Disconnect to clean up
    await prisma.$disconnect();
    
  } catch (error) {
    console.error("Health check - Database error:", error);
    
    healthStatus.verify = false;
    healthStatus.services.database = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
    healthStatus.status = "unhealthy";
    
    // Return 503 Service Unavailable for unhealthy status
    return NextResponse.json(healthStatus, { status: 503 });
  }

  // Check if response time is acceptable
  const totalLatency = Date.now() - startTime;
  if (totalLatency > 5000) {
    healthStatus.status = "degraded";
  }

  // Return successful health check
  return NextResponse.json(healthStatus, { status: 200 });
}

// Optional: HEAD method for simple health checks (used by load balancers)
export async function HEAD(req: Request) {
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}