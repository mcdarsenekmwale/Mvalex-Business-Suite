// app/admin/AdminClientLayout.tsx (Client Component)
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import { getAdminEventReader } from "@/lib/events/admin-event-reader";
import { AdminEventMonitor } from "@/components/admin/events/AdminEventMonitor";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminClientLayoutProps {
  children: React.ReactNode;
  session: any;
}

export function AdminClientLayout({ children, session }: AdminClientLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check mobile on mount and resize
  useEffect(() => {
    if (!isMounted) return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, [isMounted]);

  // Initialize admin event reader
  useEffect(() => {
    if (!isMounted) return;
    
    if (session?.user?.id && (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN")) {
      const eventReader = getAdminEventReader();
      const token = session.user.id;
      eventReader.connect(session.user.id, token, session.user.role as "ADMIN" | "SUPER_ADMIN");
      
      return () => {
        eventReader.disconnect();
      };
    }
  }, [session, isMounted]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (!isMounted) return;
    
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile, sidebarOpen, isMounted]);

  // Prevent body scroll when sidebar or monitor is open on mobile
  useEffect(() => {
    if (!isMounted) return;
    
    if (isMobile && (sidebarOpen || monitorOpen)) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen, monitorOpen, isMobile, isMounted]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <AdminSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-300",
        "lg:ml-80"
      )}>
        <AdminHeader 
          onMenuClick={() => setSidebarOpen(true)} 
          onEventClick={() => setMonitorOpen(true)} 
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Desktop Event Monitor - Fixed Right Panel */}
      {!isMobile && monitorOpen && (
        <div className="fixed right-0 top-16 bottom-0 w-96 border-l bg-background shadow-lg z-30 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Event Monitor
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonitorOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AdminEventMonitor 
              showNotifications 
              categories={["system", "security", "tickets", "users", "revenue"]}
              onClose={() => setMonitorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile Event Monitor Sheet */}
      <Sheet open={monitorOpen} onOpenChange={setMonitorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Event Monitor
              </h3>
              
            </div>
            <div className="flex-1 overflow-hidden">
              <AdminEventMonitor 
                showNotifications 
                categories={["system", "security", "tickets", "users", "revenue"]}
                onClose={() => setMonitorOpen(false)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Floating Action Button for Event Monitor */}
      {isMobile && !monitorOpen && (
        <Button
          onClick={() => setMonitorOpen(true)}
          className="fixed bottom-4 right-4 rounded-full shadow-lg z-40 h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90"
          size="icon"
        >
          <Bell className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}