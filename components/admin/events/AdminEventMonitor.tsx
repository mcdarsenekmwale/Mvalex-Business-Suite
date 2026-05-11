// components/admin/events/AdminEventMonitor.tsx
"use client";

import { useState, useEffect } from "react";
import { useAdminEventReader, AdminEventType } from "@/lib/events/admin-event-reader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Activity, 
  AlertTriangle, 
  Shield, 
  Users, 
  Ticket, 
  DollarSign,
  X,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminEventMonitorProps {
  showNotifications?: boolean;
  categories?: string[];
  onClose?: () => void;
}

interface EventItem {
  id: string;
  type: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "critical";
  category: string;
  title: string;
  message: string;
  actionRequired?: boolean;
  actionUrl?: string;
  read?: boolean;
}

export function AdminEventMonitor({ 
  showNotifications = true, 
  categories = ["all"],
  onClose 
}: AdminEventMonitorProps) {
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { isConnected, metrics, onCategory, on } = useAdminEventReader();

  // Load cached events from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("admin_events_cache");
    if (cached) {
      try {
        const events = JSON.parse(cached);
        setRecentEvents(events.slice(0, 50));
      } catch (error) {
        console.error("Failed to load cached events:", error);
      }
    }
  }, []);

  // Listen to events
  useEffect(() => {
    const categoriesToWatch = categories.includes("all") 
      ? ["system", "users", "tickets", "agents", "revenue", "security", "analytics"]
      : categories;
    
    const unsubscribes = categoriesToWatch.map(category => 
      onCategory(category, (payload) => {
        const newEvent: EventItem = {
          id: payload.id,
          type: payload.type,
          timestamp: payload.timestamp,
          severity: payload.severity,
          category: payload.category,
          title: payload.title,
          message: payload.message,
          actionRequired: payload.actionRequired,
          actionUrl: payload.actionUrl,
          read: false,
        };
        
        setRecentEvents(prev => {
          const updated = [newEvent, ...prev].slice(0, 100);
          // Save to localStorage
          localStorage.setItem("admin_events_cache", JSON.stringify(updated));
          return updated;
        });
        
        // Show browser notification for critical events
        if (showNotifications && payload.severity === "critical" && Notification.permission === "granted") {
          new Notification(payload.title, { body: payload.message });
        }
      })
    );
    
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [categories, onCategory, showNotifications]);

  // Request notification permission on mount
  useEffect(() => {
    if (showNotifications && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [showNotifications]);

  const markAsRead = (eventId: string) => {
    setRecentEvents(prev => 
      prev.map(event => 
        event.id === eventId ? { ...event, read: true } : event
      )
    );
    localStorage.setItem("admin_events_cache", JSON.stringify(recentEvents));
  };

  const markAllAsRead = () => {
    setRecentEvents(prev => 
      prev.map(event => ({ ...event, read: true }))
    );
    localStorage.setItem("admin_events_cache", JSON.stringify(recentEvents));
  };

  const clearAllEvents = () => {
    setRecentEvents([]);
    localStorage.removeItem("admin_events_cache");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800";
      case "error": return "bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "warning": return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      default: return "bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "users": return <Users className="h-4 w-4" />;
      case "tickets": return <Ticket className="h-4 w-4" />;
      case "revenue": return <DollarSign className="h-4 w-4" />;
      case "security": return <Shield className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const filteredEvents = recentEvents.filter(event => {
    // Filter by severity
    if (filter !== "all" && event.severity !== filter) return false;
    
    // Filter by read status
    if (showOnlyUnread && event.read) return false;
    
    // Filter by category
    if (selectedCategory !== "all" && event.category !== selectedCategory) return false;
    
    return true;
  });

  const unreadCount = recentEvents.filter(e => !e.read).length;
  const criticalCount = recentEvents.filter(e => e.severity === "critical" && !e.read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-sm font-medium">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {criticalCount} Critical
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs"
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllEvents}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              Clear all
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{metrics.eventsReceived}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{unreadCount}</div>
            <div className="text-xs text-muted-foreground">Unread</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{metrics.errors}</div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Severity: {filter === "all" ? "All" : filter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("critical")}>Critical</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("error")}>Error</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("warning")}>Warning</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("info")}>Info</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Category: {selectedCategory === "all" ? "All" : selectedCategory}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedCategory("all")}>All Categories</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("system")}>System</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("users")}>Users</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("tickets")}>Tickets</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("agents")}>Agents</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("revenue")}>Revenue</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("security")}>Security</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={showOnlyUnread ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          >
            {showOnlyUnread ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            Unread only
          </Button>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events to display</p>
                <p className="text-xs">Events will appear here when they occur</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer",
                    getSeverityColor(event.severity),
                    !event.read && "border-l-4 border-l-current"
                  )}
                  onClick={() => markAsRead(event.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {getSeverityIcon(event.severity)}
                        {getCategoryIcon(event.category)}
                      </div>
                      <span className="font-medium text-sm">{event.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.actionRequired && (
                        <Badge variant="secondary" className="text-xs">
                          Action
                        </Badge>
                      )}
                      {!event.read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mt-1">{event.message}</p>
                  {event.actionRequired && event.actionUrl && (
                    <div className="mt-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-6 p-0 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(event.actionUrl, "_blank");
                        }}
                      >
                        Take Action →
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Real-time admin events • {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}