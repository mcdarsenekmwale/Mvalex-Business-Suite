/**
 * Middleware for Mvalex Business Suite
 * Handles auth, admin protection, rate limiting, and security headers
 * MFA checks are handled via cookies set during login/verification to avoid database calls
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getClientIP, shouldBypassAuth } from "./middleware.utils";
import { canAccessAdminPortal, isAdmin, isSuperAdmin, UserRole } from "./lib/auth/permissions";

interface Token {
  id?: string;
  email?: string;
  role?: string;
  roleSubtype?: string;
  creditsBalance?: number;
  status?: string;
  emailVerified?: boolean;
  createdAt?: string;
  [key: string]: any;
}

// Route configurations
const protectedRoutes = [
  "/dashboard",
  "/business-cards",
  "/invoices",
  "/logos",
  "/ai-assistant",
  "/support",
  "/settings",
  "/admin",
  "/api/user",
  "/api/business-cards",
  "/api/invoices",
  "/api/logos",
  "/api/credits",
  "/api/notifications",
];

const authRoutes = ["/auth/login", "/auth/register", "/auth/error", "/auth/verify-request"];
const publicRoutes = ["/", "/pricing", "/about", "/contact", "/api/health/status", "/api/public"];

// MFA public routes (exempt from MFA checks)
const mfaPublicRoutes = ["/auth/mfa", "/api/mfa", "/api/auth", "/auth/logout"];

// Admin route configurations
const adminOnlyRoutes = [
  "/admin/users", 
  "/admin/tickets", 
  "/admin/agents", 
  "/admin/settings", 
  "/admin/templates",
  "/admin/email-templates", 
  "/admin/pricing", 
  "/admin/analytics",
  "/admin/notifications", 
  "/admin/system"
];

const superAdminOnlyRoutes = [
  "/admin/system", 
  "/admin/roles", 
  "/admin/audit-logs", 
  "/admin/monitoring", 
  "/admin/backup", 
  "/admin/security"
];

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// Helper function to check if route matches any pattern
const matchesRoute = (pathname: string, routes: string[]): boolean => {
  return routes.some(route => {
    // Handle wildcard routes like /admin/roles/*
    if (route.endsWith("/*")) {
      const baseRoute = route.slice(0, -2);
      return pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(route + "/");
  });
};

// Helper to check MFA status from JWT token (no database call)
const checkMFAStatus = (token: Token): { needsSetup: boolean; needsVerification: boolean } => {
  const mfaEnabled = token.mfaEnabled === true;
  const mfaRequired = token.mfaRequired === true;
  const mfaVerifiedAt = token.mfaVerifiedAt as number | undefined;

  // If MFA is required by policy but user hasn't enabled it yet, they need setup
  if (mfaRequired && !mfaEnabled) {
    return { needsSetup: true, needsVerification: false };
  }

  // If MFA is enabled, check if they've verified recently (within last 12 hours)
  // or if mfaVerifiedAt is explicitly set
  const recentlyVerified = mfaVerifiedAt ? (Date.now() - mfaVerifiedAt) < 12 * 60 * 60 * 1000 : false;

  if (mfaEnabled && !recentlyVerified) {
    return { needsSetup: false, needsVerification: true };
  }

  return { needsSetup: false, needsVerification: false };
};

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  
  // Check for Content Security Policy in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  // Maintenance mode check (highest priority)
  if (process.env.MAINTENANCE_MODE === "true" && !shouldBypassAuth(request)) {
    // Allow health checks during maintenance
    if (pathname === "/api/health/status" || pathname === "/api/health/backup") {
      return response;
    }
    // Allow admin IPs during maintenance (optional)
    const allowedIPs = process.env.MAINTENANCE_ALLOWED_IPS?.split(",") || [];
    const clientIP = getClientIP(request);
    if (!allowedIPs.includes(clientIP)) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  // Check for public routes first
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    return response;
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const clientIP = request.headers.get("x-forwarded-for") || request.nextUrl.hostname || "unknown";
    const now = Date.now();
    const rateLimit = rateLimitMap.get(clientIP);
    
    if (rateLimit) {
      if (now - rateLimit.timestamp > RATE_LIMIT_WINDOW) {
        // Reset window
        rateLimitMap.set(clientIP, { count: 1, timestamp: now });
      } else if (rateLimit.count > MAX_REQUESTS_PER_WINDOW) {
        // Rate limit exceeded
        return NextResponse.json(
          { error: "Too many requests", message: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      } else {
        // Increment count
        rateLimitMap.set(clientIP, { count: rateLimit.count + 1, timestamp: rateLimit.timestamp });
      }
    } else {
      // First request
      rateLimitMap.set(clientIP, { count: 1, timestamp: now });
    }
  }

  // Check authentication
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  }) as Token | null;

  // Bypass authentication for maintenance mode, health checks, and public routes
  if (shouldBypassAuth(request)) {
    return response;
  }

  // Log authentication attempts for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log(`[Middleware] Path: ${pathname}, Authenticated: ${!!token}, Role: ${token?.role || "none"}`);
  }

  // Check if route is protected
  const isProtected = matchesRoute(pathname, protectedRoutes);
  const isAuthRoute = matchesRoute(pathname, authRoutes);
  const isMFAPublicRoute = matchesRoute(pathname, mfaPublicRoutes);
  
  // Redirect unauthenticated users from protected routes
  if (isProtected && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect authenticated users from auth routes
  if (isAuthRoute && token) {
    // Check for callbackUrl parameter
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl && callbackUrl.startsWith("/")) {
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // Admin route protection — uses centralized permission system
  if (pathname.startsWith("/admin") && token) {
    const userRole = token.role || "USER";
    const userRoleType = token.roleSubtype || token.role || "";

    // Super Admin only routes
    if (matchesRoute(pathname, superAdminOnlyRoutes)) {
      if (!isSuperAdmin(userRole as UserRole)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    // Admin only routes
    if (matchesRoute(pathname, adminOnlyRoutes)) {
      if (!isAdmin(userRole as UserRole) && !canAccessAdminPortal(userRoleType as UserRole)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    // General admin area access
    if (!isAdmin(userRole as UserRole) && !canAccessAdminPortal(userRoleType as UserRole)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin") && token) {
    const userRole = token.role || "USER";
    const userRoleType = token.roleSubtype || token.role || "";
    
    if (!isAdmin(userRole as UserRole) && !canAccessAdminPortal(userRoleType as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  
  // Check for suspended users
  if (token && token.status === "SUSPENDED") {
    // Allow access to suspension info page
    if (pathname !== "/account-suspended") {
      return NextResponse.redirect(new URL("/account-suspended", request.url));
    }
    return response;
  }
  
  // Email verification check (optional)
  if (token && !token.emailVerified && pathname !== "/verify-email" && !pathname.startsWith("/auth/")) {
    // Allow some time for verification
    const createdAt = token.createdAt;
    const hoursSinceCreation = createdAt ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60) : 0;
    
    if (hoursSinceCreation > 24) {
      return NextResponse.redirect(new URL("/verify-email", request.url));
    }
  }

  // MFA enforcement check - Uses JWT token instead of database calls
  if (token && !isMFAPublicRoute && !pathname.startsWith("/auth/") && !pathname.startsWith("/api/auth")) {
    const { needsSetup, needsVerification } = checkMFAStatus(token);
    
    if (needsSetup) {
      const mfaUrl = new URL("/auth/mfa/setup", request.url);
      mfaUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(mfaUrl);
    }
    
    if (needsVerification) {
      const mfaUrl = new URL("/auth/mfa", request.url);
      mfaUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(mfaUrl);
    }
  }

  // Add security headers for authenticated sessions
  if (token) {
    // Prevent caching for authenticated pages
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    
    // Add user role header for debugging (optional)
    if (process.env.NODE_ENV === "development") {
      response.headers.set("X-User-Role", token.role || "USER");
    }
  }
  
  return response;
}

// Clean up rate limit map periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api/webhooks).*)",
  ],
};