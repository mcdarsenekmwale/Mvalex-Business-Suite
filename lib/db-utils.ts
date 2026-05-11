// lib/db-utils.ts
import { prisma } from "./prisma";

export class DatabaseManager {
  private static isConnected = false;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 2000;

  static async connect(): Promise<boolean> {
    try {
      await prisma.$connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("Database connected successfully");
      return true;
    } catch (error) {
      console.error("Database connection failed:", error);
      this.isConnected = false;
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      this.isConnected = false;
      console.log("Database disconnected");
    } catch (error) {
      console.error("Error disconnecting database:", error);
    }
  }

  static async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return false;
    }

    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    return await this.connect();
  }

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.isConnected) {
          await this.reconnect();
        }
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          await this.reconnect();
        }
      }
    }
    
    throw lastError || new Error("Operation failed after multiple retries");
  }

  static async healthCheck(): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.executeWithRetry(async () => {
        await prisma.$queryRaw`SELECT 1 as connected`;
      }, 2);
      
      return {
        connected: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Initialize connection on module load
DatabaseManager.connect().catch(console.error);

// Handle process termination
process.on("SIGINT", async () => {
  await DatabaseManager.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await DatabaseManager.disconnect();
  process.exit(0);
});