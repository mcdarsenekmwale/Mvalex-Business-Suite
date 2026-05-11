// components/general/layout/UserSidebar.tsx 
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutWithLog } from "@/lib/activities/use-auth-activity";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Palette,
  Bot,
  HelpCircle,
  Settings,
  LogOut,
  Coins,
  X,
  History,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { useTheme } from "next-themes";
import Image from "next/image";

interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & stats" },
  { href: "/business-cards", label: "Business Cards", icon: CreditCard, description: "Create & manage cards" },
  { href: "/invoices", label: "Invoices", icon: FileText, description: "Generate invoices" },
  { href: "/logos", label: "AI Logos", icon: Palette, description: "AI-powered logos" },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot, description: "Get help & guidance" },
  { href: "/history", label: "History", icon: History, description: "View your exports" },
  { href: "/support", label: "Support", icon: HelpCircle, description: "Get help" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Account preferences" },
];

export function UserSidebar({ isOpen, onClose }: UserSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Move ALL hooks to top level - no conditional hooks
  const { data: balance, isLoading } = useCreditBalance();
  const logoSrc = mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  useEffect(() => {
    setMounted(true);
    // Set initial mobile state
    setIsMobile(window.innerWidth < 1024);
    
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const creditPercentage = Math.min(((balance || 0) / 500) * 100, 100);

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider>
      {/* Sidebar - no fragment wrapper */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-72 bg-background border-r shadow-lg flex flex-col transition-transform duration-300 ease-in-out",
          isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        {isMobile && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors z-50"
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        {/* Logo Section */}
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
              {mounted && (
                <Image
                  src={logoSrc}
                  alt="Mvalex Business Suite"
                  width={140}
                  height={40}
                  className="h-9 w-auto object-contain"
                  priority
                />
              )}
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Mvalex
              </span>
              <p className="text-xs text-muted-foreground">Business Suite</p>
            </div>
          </Link>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          
          {/* Credits Section */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{isLoading ? "Loading..." : `${balance || (session?.user as any)?.creditsBalance || 0} Credits`}</span>
              </div>
              <Link href="/settings" className="text-xs text-primary hover:underline">
                Buy More
              </Link>
            </div>
            <AnimatedProgress 
              value={creditPercentage} 
              defaultChecked={isLoading}
              className="h-2" 
            />
            <p className="text-xs text-muted-foreground">
              {(balance || 0) < 100 ? "Low credits! Consider purchasing more." : "Keep creating!"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {userNavItems.map((item, index) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            
            return (
              <Tooltip key={item.href + index} delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (isMobile) onClose();
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <div className="w-1 h-6 bg-primary rounded-full" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t space-y-2">
          {/* Upgrade Button */}
          <Button
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground dark:text-white"
            asChild
          >
            <Link href="/settings">
              <Star className="h-4 w-4" />
              Buy Credits
            </Link>
          </Button>
          
          {/* Sign Out */}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOutWithLog("/")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          
          {/* Version */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Version 2.0.0
          </p>
        </div>
      </aside>
    </TooltipProvider>
  );
}