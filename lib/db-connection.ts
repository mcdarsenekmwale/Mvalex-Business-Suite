// lib/db-connection.ts (updated)
import { prisma } from "./prisma";

export class DatabaseConnection {
  private static isConnected = false;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 3000;
  private static connectionPromise: Promise<boolean> | null = null;

  static async ensureConnection(): Promise<boolean> {
    // Return cached promise if connection is in progress
    if (this.connectionPromise) {
      return await this.connectionPromise;
    }

    if (this.isConnected) {
      // Verify connection is still alive
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch (error) {
        console.log("Connection lost, reconnecting...");
        this.isConnected = false;
      }
    }

    this.connectionPromise = this.connect();
    const result = await this.connectionPromise;
    this.connectionPromise = null;
    return result;
  }

  private static async connect(): Promise<boolean> {
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

  static async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return false;
    }

    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      await prisma.$disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }

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
        const connected = await this.ensureConnection();
        if (!connected) {
          throw new Error("Database not connected");
        }
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          const reconnected = await this.reconnect();
          if (!reconnected) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
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
DatabaseConnection.ensureConnection().catch(console.error);