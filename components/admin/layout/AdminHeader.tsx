// components/admin/layout/AdminHeader.tsx
"use client";

import { useSession } from "next-auth/react";
import { signOutWithLog } from "@/lib/activities/use-auth-activity";
import { 
  Bell, 
  Search, 
  Moon, 
  Sun, 
  Settings,
  LogOut,
  User,
  Shield,
  HelpCircle,
  LayoutDashboard,
  Users,
  Ticket,
  CreditCard,
  Activity,
  Monitor,
  Menu
} from "lucide-react";
import { useApiStatus } from "@/hooks/use-api-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface AdminHeaderProps {
  onMenuClick?: () => void;
  onEventClick?: () => void;
}

export function AdminHeader({ onMenuClick, onEventClick }: AdminHeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { lastBackupTime, apiResponseTime, activeUsers } = useApiStatus();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Fetch real notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications?unread=true&limit=20");
        if (!res.ok) return;
        const data = await res.json();
        const mapped: Notification[] = (data.notifications || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: (n.type?.toLowerCase() === "system_update" ? "success" :
                 n.type?.toLowerCase() === "credit_low" ? "warning" :
                 n.type?.toLowerCase() === "ticket_response" ? "info" :
                 n.type?.toLowerCase() === "welcome" ? "success" :
                 n.type?.toLowerCase() === "password_changed" ? "warning" :
                 n.type?.toLowerCase() === "invoice_paid" ? "success" :
                 n.type?.toLowerCase() === "export_complete" ? "success" :
                 n.type?.toLowerCase() === "credit_purchased" ? "success" :
                 "info") as Notification["type"],
          timestamp: new Date(n.createdAt),
          read: n.isRead,
          link: n.actionUrl || undefined,
        }));
        setNotifications(mapped);
        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
    fetchNotifications();
  }, []);

  const getInitials = (name?: string | null) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case "warning":
        return <div className="h-2 w-2 rounded-full bg-yellow-500" />;
      case "error":
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-blue-500" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "error":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/users?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const quickActions = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin", shortcut: "G D" },
    { icon: Users, label: "Users", href: "/admin/users", shortcut: "G U" },
    { icon: Ticket, label: "Tickets", href: "/admin/tickets", shortcut: "G T" },
    { icon: CreditCard, label: "Pricing", href: "/admin/pricing", shortcut: "G P" },
    { icon: Activity, label: "Analytics", href: "/admin/analytics", shortcut: "G A" },
    { icon: Settings, label: "Settings", href: "/admin/system", shortcut: "G S" },
  ];

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Menu Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Section */}
          <div className="flex-1 flex items-center gap-4">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="relative h-10 w-full max-w-sm justify-start text-muted-foreground bg-muted/50 hover:bg-muted/70 rounded-lg"
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline-flex">Search admin...</span>
                  <span className="sm:hidden">Search...</span>
                  <kbd className="pointer-events-none absolute right-3 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search users, settings, or documents..."
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
                <div className="p-2">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Quick Actions
                  </p>
                  <div className="grid gap-1">
                    {quickActions.map((action) => (
                      <Button
                        key={action.href}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          router.push(action.href);
                          setSearchOpen(false);
                        }}
                      >
                        <action.icon className="mr-2 h-4 w-4" />
                        <span className="flex-1 text-left">{action.label}</span>
                        <kbd className="ml-auto text-xs text-muted-foreground">
                          {action.shortcut}
                        </kbd>
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Toggle */}
            {mounted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="relative"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle theme ({theme === "dark" ? "Light" : "Dark"})</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Help Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/support")}
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help & Documentation</p>
              </TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {unreadCount} unread
                      </Badge>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 cursor-pointer transition-colors hover:bg-muted/50 border-l-4",
                            getNotificationColor(notification.type),
                            !notification.read && "bg-muted/30"
                          )}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              router.push(notification.link);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {notification.title}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/admin/notifications")}
                  >
                    View all notifications
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(session?.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user?.name || "Admin User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/admin/system")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/admin/security")}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Security</span>
                    <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onClick={() => signOutWithLog("/")}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Stats Bar (Optional) */}
        <div className="border-t bg-muted/30 px-4 md:px-6 py-2 hidden lg:block">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">System Status:</span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-green-600 dark:text-green-400">All systems operational</span>
              </div>
            </div>

            <div className="flex items-center gap-2"> 
              {/* Event Monitor */}
              {onEventClick && 
                <div className="flex items-center gap-2 cursor-pointer border-b-2 border-transparent me-3" title="Event Monitor" onClick={onEventClick}>
                  <Bell className="h-3 w-3" />
                  <span className="">Event Monitor</span>
                </div>
              }

              {/* Health Monitor */}
              <div className="flex items-center gap-2 cursor-pointer text-primary/80 border-b-2 border-transparent hover:border-primary/50 me-3" title="Healthy Monitor" onClick={() => router.push("/health")}>
                <Monitor className="h-3 w-3" />
                <span className="">Healthy Monitor</span>
              </div>

              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Last backup: {new Date(lastBackupTime).toLocaleTimeString() || "never backup"}</span>
                <span>API Response: {apiResponseTime}ms</span>
                <span>Active users: {activeUsers}</span>
              </div>
            </div>

          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}