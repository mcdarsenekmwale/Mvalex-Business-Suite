"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserSidebar } from "@/components/general/layout/UserSidebar";
import { UserHeader } from "@/components/general/layout/UserHeader";

export default function GeneralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Client-side MFA enforcement
  useEffect(() => {
    if (session?.user && (session.user as any).mfaRequired && !(session.user as any).mfaVerifiedAt) {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/auth/mfa")) {
        router.push(`/auth/mfa?redirect=${encodeURIComponent(currentPath)}`);
      }
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: !isMobile ? "288px" : "0px" }}
      >
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
