// components/admin/notifications/NotificationDetailsSheet.tsx
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  User,
  Calendar,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Copy,
  Trash2,
  Ticket,
  UserPlus,
  CreditCard,
  RefreshCw,
  FileText,
  Palette,
  Bell,
  Shield,
  TrendingUp,
  Clock,
  Zap,
  MessageSquareIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

// Notification type definitions from backend
export type NotificationType = 
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_RESPONDED"
  | "TICKET_RESOLVED"
  | "TICKET_ESCALATED"
  | "TICKET_UNASSIGNED"
  | "CREDIT_LOW"
  | "CREDIT_ADDED"
  | "CREDIT_EXPIRING"
  | "SYSTEM_ALERT"
  | "AGENT_STATUS_CHANGE"
  | "EXPORT_COMPLETED"
  | "LOGO_GENERATED"
  | "INVOICE_PAID"
  | "TEMPLATE_APPROVED"
  | "SUBSCRIPTION_RENEWAL";

interface NotificationDetails {
  id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  channel?: string;
  status?: string;
  userId?: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  isRead?: boolean;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface NotificationDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: NotificationDetails | null;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResend?: (id: string) => void;
}

// Configuration for different notification types
const notificationTypeConfig: Record<NotificationType, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  TICKET_CREATED: {
    icon: Ticket,
    label: "Ticket Created",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  TICKET_ASSIGNED: {
    icon: UserPlus,
    label: "Ticket Assigned",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  TICKET_RESPONDED: {
    icon: MessageSquareIcon,
    label: "Ticket Responded",
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
  TICKET_RESOLVED: {
    icon: CheckCircle2,
    label: "Ticket Resolved",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  TICKET_ESCALATED: {
    icon: AlertTriangle,
    label: "Ticket Escalated",
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  TICKET_UNASSIGNED: {
    icon: User,
    label: "Ticket Unassigned",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  CREDIT_LOW: {
    icon: AlertTriangle,
    label: "Low Credits",
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  CREDIT_ADDED: {
    icon: TrendingUp,
    label: "Credits Added",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  CREDIT_EXPIRING: {
    icon: Clock,
    label: "Credits Expiring",
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  SYSTEM_ALERT: {
    icon: Bell,
    label: "System Alert",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
  AGENT_STATUS_CHANGE: {
    icon: RefreshCw,
    label: "Agent Status Changed",
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  EXPORT_COMPLETED: {
    icon: FileText,
    label: "Export Completed",
    color: "text-teal-500",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    borderColor: "border-teal-200 dark:border-teal-800",
  },
  LOGO_GENERATED: {
    icon: Palette,
    label: "Logo Generated",
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
  INVOICE_PAID: {
    icon: CreditCard,
    label: "Invoice Paid",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  TEMPLATE_APPROVED: {
    icon: FileText,
    label: "Template Approved",
    color: "text-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
  },
  SUBSCRIPTION_RENEWAL: {
    icon: RefreshCw,
    label: "Subscription Renewal",
    color: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    borderColor: "border-violet-200 dark:border-violet-800",
  },
};

// Fallback for unknown types
const fallbackConfig = {
  icon: Info,
  label: "Notification",
  color: "text-gray-500",
  bgColor: "bg-gray-50 dark:bg-gray-950/30",
  borderColor: "border-gray-200 dark:border-gray-800",
};

// Status configuration
const statusConfig: Record<string, { label: string; color: string }> = {
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
  READ: { label: "Read", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" },
};

// Helper function to get notification config
function getNotificationConfig(type: string) {
  if (type in notificationTypeConfig) {
    return notificationTypeConfig[type as NotificationType];
  }
  return fallbackConfig;
}

// MessageSquare icon component
const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export function NotificationDetailsSheet({
  open,
  onOpenChange,
  notification,
  onMarkAsRead,
  onDelete,
  onResend,
}: NotificationDetailsSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!notification) return null;

  const config = getNotificationConfig(notification.type);
  const TypeIcon = config.icon;
  const statusInfo = statusConfig[notification.status?.toUpperCase() || "SENT"] || statusConfig.SENT;
  const isRead = notification.isRead || notification.status === "READ";

  // Copy notification ID to clipboard
  const handleCopyId = async () => {
    await navigator.clipboard.writeText(notification.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mark as read
  const handleMarkAsRead = () => {
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  // Format metadata value for display
  const formatMetadataValue = (key: string, value: any): string => {
    if (key === "type" && value === "WARNING") return "Warning";
    if (key === "type" && value === "ERROR") return "Error";
    if (key === "type" && value === "INFO") return "Info";
    if (key === "type" && value === "SUCCESS") return "Success";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Get target information from metadata
  const getTargetInfo = () => {
    if (notification.metadata?.target) {
      const target = notification.metadata.target;
      if (target === "all") return { label: "All Users", icon: Users, description: "Broadcast to all platform users" };
      if (target === "admins") return { label: "Administrators", icon: Shield, description: "Sent to admin users only" };
      if (target === "specific") return { label: "Specific User", icon: User, description: "Sent to a single user" };
    }
    return null;
  };

  const targetInfo = getTargetInfo();
  const TargetIcon = targetInfo?.icon || Users;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <TypeIcon className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-lg">{notification.title}</SheetTitle>
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
              </div>
              <SheetDescription>
                Notification details and delivery information
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] overflow-y-auto">
          <div className="mt-6 space-y-6">
            {/* Message Content */}
            <div className={cn(
              "px-4 py-2 rounded-full border",
              "w-fit",
              config.borderColor,
              config.bgColor
            )}>
              <p className="text-xs whitespace-pre-wrap">{notification.message}</p>
            </div>

            {/* Metadata Grid - Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created</span>
                </div>
                <p className="text-sm font-medium">
                  {format(new Date(notification.createdAt), "PPP")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(notification.createdAt), "p")}
                </p>
              </div>

              {notification.deliveredAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Send className="h-3.5 w-3.5" />
                    <span>Delivered</span>
                  </div>
                  <p className="text-sm font-medium">
                    {format(new Date(notification.deliveredAt), "PPP")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.deliveredAt), "p")}
                  </p>
                </div>
              )}

              {notification.readAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Read</span>
                  </div>
                  <p className="text-sm font-medium">
                    {format(new Date(notification.readAt), "PPP")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.readAt), "p")}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Channel Information */}
            {notification.channel && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Delivery Channel
                  </h4>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{notification.channel}</p>
                        <p className="text-xs text-muted-foreground">
                          Notification was sent via {notification.channel} channel
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Recipient Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TargetIcon className="h-4 w-4" />
                Recipient Information
              </h4>
              
              {notification.user && (
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(notification.user.name || notification.user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{notification.user.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{notification.user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {targetInfo && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <TargetIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{targetInfo.label}</p>
                      <p className="text-xs text-muted-foreground">{targetInfo.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Metadata Details */}
            {notification.metadata && Object.keys(notification.metadata).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Additional Information</h4>
                <div className="space-y-2 rounded-lg border p-3">
                  {Object.entries(notification.metadata).map(([key, value]) => {
                    // Skip empty or null values
                    if (value === null || value === undefined) return null;
                    // Skip redundant type field if it matches notification type
                    if (key === "type" && value === notification.type) return null;
                    
                    return (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[100px] capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="font-mono text-xs break-all">
                          {formatMetadataValue(key, value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notification ID */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Notification ID</p>
                  <p className="text-xs font-mono mt-1 break-all">{notification.id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopyId}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="mt-6 gap-2">
          {!isRead && onMarkAsRead && (
            <Button
              variant="outline"
              onClick={handleMarkAsRead}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Mark as Read
            </Button>
          )}
          
          {onResend && notification.status?.toUpperCase() === "FAILED" && (
            <Button
              variant="outline"
              onClick={() => onResend(notification.id)}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Resend
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="destructive"
              onClick={() => onDelete(notification.id)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}