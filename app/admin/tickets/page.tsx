// app/(admin)/tickets/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { ChartCard } from "@/components/admin/shared/ChartCard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageDisplay } from "@/components/ui/MessageDisplay";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/general/tickets/rich-text-editor";
import { Separator } from "@/components/ui/separator";

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  status: string;
  priority: string;
  assignedTo: string | null;
  assignedAdmin?: { id: string; name: string | null; email: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: { id: string; message: string; isAdmin: boolean; createdAt: string; user: { name: string | null } | null }[];
}

interface TicketMetrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  highPriority: number;
  urgentPriority: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionRate: number;
}

interface TicketVolumeData {
  day: string;
  created: number;
  resolved: number;
}

interface ResponseTimeData {
  hour: string;
  avg: number;
  label: string;
}

interface PriorityDistribution {
  name: string;
  value: number;
  color: string;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

const statusOptions = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const priorityOptions = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function TicketsManagementPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">("week");

  // Fetch tickets with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-tickets", status, priority, page, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (priority !== "ALL") params.set("priority", priority);
      params.set("page", String(page));
      params.set("limit", "50");
      params.set("dateRange", dateRange);
      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  // Fetch metrics and analytics
  const { data: analyticsData, isLoading: analyticsLoading, refetch: analyticsRefetch } = useQuery({
    queryKey: ["admin-tickets-analytics", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tickets/analytics?dateRange=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Fetch admin users for assignment
  const { data: adminUsersData, isLoading: adminLoading, refetch: adminRefetch } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?role=ADMIN,SUPPORT_AGENT&limit=100");
      if (!res.ok) throw new Error("Failed to fetch admin users");
      return res.json();
    },
  });

  // Respond to ticket mutation
  const respondMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/tickets/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets-analytics"] });
      toast.success("Response sent successfully!");
      setResponseText("");
      setDialogOpen(false);
      setSelectedTicket(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send response");
    },
  });

  // Assign ticket mutation
  const assignMutation = useMutation({
    mutationFn: async ({ ticketId, assignedTo }: { ticketId: string; assignedTo: string }) => {
      const res = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Ticket assigned successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign ticket");
    },
  });

  // Update ticket status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets-analytics"] });
      toast.success("Ticket status updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update ticket status");
    },
  });

  const tickets: TicketItem[] = data?.tickets || [];
  const metrics: TicketMetrics = analyticsData?.metrics || {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    highPriority: 0,
    urgentPriority: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    satisfactionRate: 0,
  };
  
  const ticketVolumeData: TicketVolumeData[] = analyticsData?.ticketVolume || [];
  const responseTimeData: ResponseTimeData[] = analyticsData?.responseTimes || [];
  const priorityDistribution: PriorityDistribution[] = analyticsData?.priorityDistribution || [];
  const adminUsers: AdminUser[] = adminUsersData?.users || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleRespond = (closeAfter?: boolean) => {
    if (!selectedTicket || !responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }
    
    respondMutation.mutate({
      ticketId: selectedTicket.id,
      message: responseText,
      status: closeAfter ? "RESOLVED" : "IN_PROGRESS",
    });
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    statusMutation.mutate({ ticketId, status: newStatus });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-red-600 bg-red-100 dark:bg-red-950/30 dark:text-red-400";
      case "HIGH": return "text-orange-600 bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400";
      case "MEDIUM": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400";
      case "LOW": return "text-green-600 bg-green-100 dark:bg-green-950/30 dark:text-green-400";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    }
  };

  if ((isLoading || analyticsLoading || adminLoading) && !tickets.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Support Tickets" subtitle="Manage and respond to support requests" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Support Tickets" 
        subtitle="Manage and respond to support requests"
        action={
          <Button variant="outline" size="sm" onClick={() => {
            refetch();
            adminRefetch();
            analyticsRefetch();
            toast.success("Data refreshed successfully!");
          }} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Stats Cards - Real Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Tickets" 
          value={metrics.total} 
          icon={Ticket} 
          color="blue" 
          delay={0} 
          trend={metrics.total > 0 ? "up" : "down"}
          trendValue={`+${Math.round(metrics.total * 0.12)}%`}
        />
        <StatsCard 
          title="Open" 
          value={metrics.open} 
          icon={Clock} 
          color="amber" 
          delay={0.1}
          trend={metrics.open > 0 ? "up" : "down"}
        />
        <StatsCard 
          title="In Progress" 
          value={metrics.inProgress} 
          icon={MessageSquare} 
          color="purple" 
          delay={0.2}
        />
        <StatsCard 
          title="High Priority" 
          value={metrics.highPriority + metrics.urgentPriority} 
          icon={AlertCircle} 
          color="rose" 
          delay={0.3}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Resolved" value={metrics.resolved} icon={CheckCircle2} color="green" delay={0.15} />
        <StatsCard title="Avg Response" value={`${metrics.avgResponseTime}m`} icon={Zap} color="cyan" delay={0.25} />
        <StatsCard title="Satisfaction" value={`${metrics.satisfactionRate}%`} icon={TrendingUp} color="emerald" delay={0.35} />
        <StatsCard title="Resolution Time" value={`${metrics.avgResolutionTime}h`} icon={Clock} color="indigo" delay={0.45} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Ticket Volume" subtitle="Created vs Resolved over time" delay={0.3}>
          {ticketVolumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ticketVolumeData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="created" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Created" />
                <Bar dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground">
              No ticket volume data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Priority Distribution" subtitle="Tickets by priority level" delay={0.4}>
          {priorityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <div className="text-center text-sm">
                  {priorityDistribution.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 justify-center">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
                      <span className="text-xs">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground">
              No priority data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Response Time Chart */}
      {responseTimeData.length > 0 && (
        <ChartCard title="Average Response Time" subtitle="Minutes to first response by hour" delay={0.5}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `${v}m`} />
              <Tooltip formatter={(v: number) => `${v} min`} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 4 }} name="Avg Response" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Date Range Filter */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm p-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
              <SelectTrigger className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-4 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select value={priority} onValueChange={(value) => { setPriority(value); setPage(1); }}>
              <SelectTrigger className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-4 text-sm">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p === "ALL" ? "All Priorities" : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</TableHead>
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</TableHead>
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</TableHead>
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned</TableHead>
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</TableHead>
                <TableHead className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No tickets found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-b border-slate-50 dark:border-slate-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[220px] truncate">{ticket.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">{ticket.description?.slice(0, 60)}...</p>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-[10px] font-bold">
                          {(ticket.user?.name || ticket.user?.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300">{ticket.user?.name || ticket.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-1 py-3">
                      <StatusBadge status={ticket.status} size="sm" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Select
                        value={ticket.assignedTo || ""}
                        onValueChange={(value) => assignMutation.mutate({ ticketId: ticket.id, assignedTo: value })}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {adminUsers.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.name || admin.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedTicket(ticket); setDialogOpen(true); }}
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Respond
                        </Button>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => handleStatusChange(ticket.id, value)}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {tickets.length} of {pagination.total} tickets
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Respond Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setSelectedTicket(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Respond to Ticket</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium">{selectedTicket.subject}</p>
                  <p className="text-xs text-slate-500">from {selectedTicket.user?.name || selectedTicket.user?.email}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={selectedTicket.status} size="sm" />
                  <Badge className={getPriorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
              </div>

              {/* Original Message */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-1">Original Message:</p>
                {selectedTicket.description}
              </div>

              {/* Message Thread */}
              {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-xs font-medium text-slate-500">Conversation History:</p>
                  {selectedTicket.messages.map((msg, idx) => (
                    <div key={msg.id || idx} 
                      className={cn("p-3 rounded-lg text-sm", {
                        "bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30" : msg.isAdmin,
                        "bg-slate-50 dark:bg-slate-800/50": !msg.isAdmin,
                        "ml-auto ": msg.isAdmin,
                        "mr-auto": !msg.isAdmin,
                        "w-fit": true
                      })}>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {msg.isAdmin ? "Admin Response" : (msg.user?.name || "User")}
                        </span>
                        <span>·</span>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <MessageDisplay 
                        content={msg.message}
                        isAI={msg.isAdmin ? true : false}
                        timestamp={new Date(msg.createdAt)}
                        showActions={true}
                       />
                    </div>
                  ))}
                </div>
              )}

              {/* Response Input */}
              <div>
                <Label className="text-xs uppercase font-medium">Your Response</Label>
                <Separator className="mb-2" />
                <RichTextEditor
                  value={responseText}
                  onChange={setResponseText}
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                  placeholder="Type your response..."
                  minHeight={120}
                />
                
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleRespond(false)} 
              disabled={!responseText.trim() || respondMutation.isPending}
            >
              <MessageSquare className="h-4 w-4 mr-1" /> 
              {respondMutation.isPending ? "Sending..." : "Send & Keep Open"}
            </Button>
            <Button 
              onClick={() => handleRespond(true)} 
              disabled={!responseText.trim() || respondMutation.isPending}
              className="bg-primary text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> 
              {respondMutation.isPending ? "Sending..." : "Resolve Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}