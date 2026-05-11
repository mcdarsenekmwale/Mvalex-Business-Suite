// app/health/layout.tsx
import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "System Health Dashboard | Mvalex Business Suite",
  description: "Monitor system health, service status, and performance metrics",
  robots: {
    index: false,
    follow: false,
  },
};

interface HealthLayoutProps {
  children: ReactNode;
}

// Client component for the interactive header actions
function HealthHeaderActions() {
  return (
    <div className="flex items-center gap-4">
      <Link href="/admin/dashboard">
        <Button variant="outline" size="sm" className="gap-2">
          <LayoutDashboard className="w-4 h-4" />
          <span>Main Dashboard</span>
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">Live Monitoring</span>
      </div>
    </div>
  );
}

export default function HealthLayout({ children }: HealthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                System Health Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time monitoring and service status
              </p>
            </div>
            <HealthHeaderActions />
          </div>
          <div className="h-px bg-gradient-to-r from-primary/20 via-primary/10 to-transparent mt-4" />
        </div>
        
        {children}
      </div>
    </div>
  );
}