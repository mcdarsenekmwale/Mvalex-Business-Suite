// app/(admin)/audit-logs/security/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  User,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  Server,
  Database,
  Key,
  LogIn,
  LogOut,
  UserPlus,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types
interface SecurityEvent {
  id: string;
  eventType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  uniqueUsers: number;
  uniqueIPs: number;
  failedLogins: number;
  successfulLogins: number;
  permissionChanges: number;
  roleChanges: number;
}

const severityColors = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  LOW: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
};

const eventTypeIcons: Record<string, any> = {
  LOGIN_SUCCESS: LogIn,
  LOGIN_FAILURE: AlertTriangle,
  LOGOUT: LogOut,
  USER_CREATED: UserPlus,
  USER_DELETED: UserX,
  USER_SUSPENDED: ShieldAlert,
  USER_ACTIVATED: ShieldCheck,
  ROLE_CHANGED: Shield,
  PERMISSION_CHANGED: Key,
  PASSWORD_CHANGED: Lock,
  MFA_ENABLED: ShieldCheck,
  MFA_DISABLED: ShieldAlert,
  API_KEY_CREATED: Key,
  API_KEY_REVOKED: Key,
  SESSION_REVOKED: XCircle,
};

const eventTypeLabels: Record<string, string> = {
  LOGIN_SUCCESS: "Successful Login",
  LOGIN_FAILURE: "Failed Login Attempt",
  LOGOUT: "Logout",
  USER_CREATED: "User Created",
  USER_DELETED: "User Deleted",
  USER_SUSPENDED: "User Suspended",
  USER_ACTIVATED: "User Activated",
  ROLE_CHANGED: "Role Changed",
  PERMISSION_CHANGED: "Permission Changed",
  PASSWORD_CHANGED: "Password Changed",
  MFA_ENABLED: "2FA Enabled",
  MFA_DISABLED: "2FA Disabled",
  API_KEY_CREATED: "API Key Created",
  API_KEY_REVOKED: "API Key Revoked",
  SESSION_REVOKED: "Session Revoked",
};

export default function SecurityAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [severity, setSeverity] = useState<string>("all");
  const [eventType, setEventType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year" | "all">("week");

  // Fetch security events
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["security-audit-logs", page, pageSize, severity, eventType, searchQuery, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(severity !== "all" && { severity }),
        ...(eventType !== "all" && { eventType }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateRange !== "all" && { dateRange }),
      });
      const res = await fetch(`/api/admin/audit-logs/security?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch security logs");
      return res.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["security-audit-stats", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== "all") params.set("dateRange", dateRange);
      const res = await fetch(`/api/admin/audit-logs/security/stats?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const events: SecurityEvent[] = data?.events || [];
  const stats: SecurityStats = statsData?.stats || {
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0,
    uniqueUsers: 0,
    uniqueIPs: 0,
    failedLogins: 0,
    successfulLogins: 0,
    permissionChanges: 0,
    roleChanges: 0,
  };
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const getEventIcon = (type: string) => {
    const Icon = eventTypeIcons[type] || Activity;
    return Icon;
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(severity !== "all" && { severity }),
        ...(eventType !== "all" && { eventType }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateRange !== "all" && { dateRange }),
        format: "csv",
      });
      const res = await fetch(`/api/admin/audit-logs/security/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Security logs exported successfully");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Security Audit Logs" subtitle="Track security events and incidents" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit Logs"
        subtitle="Track security events, authentication attempts, and access control changes"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Events" value={stats.totalEvents} icon={Activity} color="blue" delay={0} />
        <StatsCard title="Critical Events" value={stats.criticalEvents} icon={AlertTriangle} color="red" delay={0.1} />
        <StatsCard title="Failed Logins" value={stats.failedLogins} icon={AlertTriangle} color="orange" delay={0.2} />
        <StatsCard title="Unique Users" value={stats.uniqueUsers} icon={Users} color="green" delay={0.3} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="High Severity" value={stats.highEvents} icon={ShieldAlert} color="orange" delay={0.15} />
        <StatsCard title="Role Changes" value={stats.roleChanges} icon={Shield} color="purple" delay={0.25} />
        <StatsCard title="Permission Changes" value={stats.permissionChanges} icon={Key} color="cyan" delay={0.35} />
        <StatsCard title="Unique IPs" value={stats.uniqueIPs} icon={Server} color="slate" delay={0.45} />
      </div>

      {/* Filters */}
      <Card className="mt-4 shadow-md rounded-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                <SelectItem value="LOGIN_FAILURE">Login Failure</SelectItem>
                <SelectItem value="USER_CREATED">User Created</SelectItem>
                <SelectItem value="USER_SUSPENDED">User Suspended</SelectItem>
                <SelectItem value="ROLE_CHANGED">Role Changed</SelectItem>
                <SelectItem value="PERMISSION_CHANGED">Permission Changed</SelectItem>
                <SelectItem value="PASSWORD_CHANGED">Password Changed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="mt-4 shadow-md rounded-md">
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>
            Showing {events.length} of {pagination.total} security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(pageSize)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No security events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const Icon = getEventIcon(event.eventType);
                  return (
                    <TableRow key={event.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Badge className={severityColors[event.severity]}>
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{eventTypeLabels[event.eventType] || event.eventType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={event.user?.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {(event.user?.name || event.user?.email || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{event.user?.name || event.user?.email || "System"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <span className="text-sm">{event.description}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.ipAddress || "N/A"}</code>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs">{format(new Date(event.createdAt), "MMM d, yyyy")}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(event.createdAt), "h:mm:ss a")}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div className="pt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.limit}
            totalItems={pagination.total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showPageSize
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      )}
    </div>
  );
}