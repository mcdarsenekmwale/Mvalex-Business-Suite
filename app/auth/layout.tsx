// app/auth/layout.tsx
"use client";

import { FullPageLoading } from "@/components/shared/ui/full-page-loading";
import { useSession } from "@/hooks/use-session";
import { redirect, usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingMFA, setIsCheckingMFA] = useState(false);

  // MFA public routes that don't require MFA verification
  const mfaPublicRoutes = ["/auth/mfa", "/auth/mfa/setup", "/auth/mfa/recovery"];
  const isMFAPublicRoute = mfaPublicRoutes.some(route => pathname?.startsWith(route));

  useEffect(() => {
    // Check MFA status when session is available
    const checkMFAStatus = async () => {
      if (session?.user?.id && !isMFAPublicRoute) {
        try {
          const response = await fetch("/api/auth/mfa/status");
          const data = await response.json();
          
          if (data.requiresMFASetup) {
            router.push("/auth/mfa/setup");
          } else if (data.requiresMFAVerification && !pathname?.includes("/auth/mfa")) {
            router.push("/auth/mfa");
          }
        } catch (error) {
          console.error("Failed to check MFA status:", error);
        } finally {
          setIsCheckingMFA(false);
        }
      }
    };

    if (session?.user && !isMFAPublicRoute) {
      setIsCheckingMFA(true);
      checkMFAStatus();
    }
  }, [session, pathname, router, isMFAPublicRoute]);

  // Show loading while checking authentication
  if (status === "loading" || isCheckingMFA) {
    return <FullPageLoading />;
  }

  // Redirect authenticated users to dashboard, but allow MFA routes
  if ((session?.user || status === 'authenticated') && !isMFAPublicRoute) {
    return redirect('/dashboard');
  }

  // For MFA routes, allow access even if authenticated
  if (isMFAPublicRoute && (session?.user || status === 'authenticated')) {
    return <>{children}</>;
  }

  // Redirect to home if not authenticated and trying to access auth pages (except login/register)
  const publicAuthRoutes = ["/auth/login", "/auth/register", "/auth/error", "/auth/verify-request"];
  if (!session?.user && status !== 'authenticated' && !publicAuthRoutes.some(route => pathname?.startsWith(route))) {
    return redirect('/auth/login');
  }

  return <>{children}</>;
}