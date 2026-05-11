// app/api/log-error/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const errorData = await req.json();
    
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Client Error:", errorData);
    }
    
    // In production, send to your error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to Sentry
      // import * as Sentry from "@sentry/nextjs";
      // Sentry.captureException(new Error(errorData.message), { extra: errorData });
      
      // Or send to your own API
      await fetch(process.env.ERROR_WEBHOOK_URL || "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorData),
      }).catch(console.error);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging failed:", error);
    return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
  }
}