// app/(admin)/notifications/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Send,
  Mail,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { toast } from "sonner";
import {
  TableCell,
  TableHead,
  TableBody,
  TableRow,
  Table,
  TableHeader,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NotificationDetailsSheet } from "@/components/admin/notifications/NotificationDetailsSheet";

const typeIcons: Record<string, any> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
};

export default function NotificationsManagementPage() {
  const queryClient = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState("all");
  const [specificUserId, setSpecificUserId] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch notifications with pagination
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-notifications", currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      const res = await fetch(`/api/admin/notifications/all?${params.toString()}`);
      if (res.status === 404) {
        return { 
          notifications: [], 
          stats: { total: 0, unread: 0, sentToday: 0 },
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        };
      }
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    retry: false,
  });

  // Details sheet state
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-notifications"] });
      toast.success("Notification marked as read");
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete notification");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-notifications"] });
      toast.success("Notification deleted");
      setDetailsOpen(false);
    },
  });

  // Resend notification mutation
  const resendNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/admin/notifications/${notificationId}/resend`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to resend notification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Notification resent successfully");
    },
  });

  // Send notification mutation
  const sendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to send notification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Notification sent successfully!");
      setComposeOpen(false);
      setTitle("");
      setMessage("");
      setType("info");
      setTarget("all");
      setSpecificUserId("");
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ["admin-all-notifications"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send notification");
    },
  });

  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setDetailsOpen(true);
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const handleResend = (id: string) => {
    resendNotificationMutation.mutate(id);
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    sendMutation.mutate({
      title,
      message,
      type: type.toUpperCase(),
      target,
      userId: target === "specific" ? specificUserId : undefined,
    });
  };

  const stats = data?.stats || { total: 0, unread: 0, sentToday: 0 };
  const notifications = data?.notifications || [];
  const pagination = data?.pagination || { 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 0 
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        subtitle="Manage and broadcast platform notifications"
        action={
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
                <Send className="h-4 w-4" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Notification title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Write your message..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="admins">Admins Only</SelectItem>
                        <SelectItem value="specific">Specific User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {target === "specific" && (
                  <div className="space-y-2">
                    <Label>User ID or Email</Label>
                    <Input
                      placeholder="Enter user ID or email..."
                      value={specificUserId}
                      onChange={(e) => setSpecificUserId(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setComposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={sendMutation.isPending} className="bg-primary text-white">
                  {sendMutation.isPending && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Send Notification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sent"
          value={stats.total || 0}
          icon={Mail}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Unread"
          value={stats.unread || 0}
          icon={Bell}
          color="amber"
          delay={0.1}
        />
        <StatsCard
          title="Sent Today"
          value={stats.sentToday || 0}
          icon={Send}
          color="green"
          delay={0.2}
        />
        <StatsCard
          title="Delivery Rate"
          value="100%"
          icon={CheckCircle2}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Notifications Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
      >
        <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" /> Recent Notifications
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 dark:border-slate-800/60">
                <TableHead className="text-left py-3 px-4 font-medium">Type</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">Title</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">Message</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">Recipient</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} >
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No notifications sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n: any) => {
                  const Icon = typeIcons[n.type?.toLowerCase()] || Info;
                  return (
                    <TableRow
                      key={n.id}
                      className="border-b cursor-pointer border-slate-50 dark:border-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      onClick={() => handleViewDetails(n)}
                    >
                      <TableCell className="py-3 px-4">
                        <Badge className={typeColors[n.type?.toLowerCase()] || typeColors.info}>
                          <Icon className="h-3 w-3 mr-1" />
                          {n.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 font-medium text-sm">
                        {n.title}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                        {n.message}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                        {n.user?.email || n.user?.name || "All Users"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </motion.div>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div className="pt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.limit}
            totalItems={pagination.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            showPageSize
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      )}

      {/* Notification Details Sheet */}
      <NotificationDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        notification={selectedNotification}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
        onResend={handleResend}
      />
    </div>
  );
}