// middleware.utils.ts (Optional helper functions)
import { NextRequest } from "next/server";

export function isBot(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
    /puppeteer/i,
    /selenium/i,
  ];
  return botPatterns.some((pattern) => pattern.test(userAgent));
}

export function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") || 
         request.headers.get("x-real-ip") || 
         request.nextUrl.hostname || 
         "unknown";
}

export function shouldBypassAuth(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  const bypassPaths = [
    "/api/health/status",
    "/api/health/backup",
    "/api/health/backup",
    "/api/health/backup",
    "/api/health/backup",
    "/api/public",
    "/api/webhooks",
    "/_next",
  ];
  return bypassPaths.some((path) => pathname.startsWith(path));
}

export function isLocalRequest(request: NextRequest): boolean {
  const hostname = request.headers.get("host") || "";
  return hostname.includes("localhost") || hostname.includes("127.0.0.1");
}