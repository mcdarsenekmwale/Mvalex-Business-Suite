// app/(admin)/audit-logs/system/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Search,
  Filter,
  Download,
  RefreshCw,
  Database,
  Cloud,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SystemEvent {
  id: string;
  eventType: string;
  status: "SUCCESS" | "FAILURE" | "WARNING" | "INFO";
  description: string;
  component: string;
  metadata: Record<string, any>;
  duration?: number;
  createdAt: string;
}

interface SystemStats {
  totalEvents: number;
  successEvents: number;
  failureEvents: number;
  warningEvents: number;
  infoEvents: number;
  avgResponseTime: number;
  uptime: number;
  databaseHealth: string;
  cacheHealth: string;
  storageHealth: string;
}

const statusColors = {
  SUCCESS: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  FAILURE: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  WARNING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  INFO: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
};

const componentIcons: Record<string, any> = {
  database: Database,
  api: Cloud,
  cache: Activity,
  storage: HardDrive,
  queue: Zap,
  websocket: Wifi,
  auth: Shield,
  worker: Cpu,
};

export default function SystemAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string>("all");
  const [component, setComponent] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year" | "all">("week");

  // Fetch system events
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["system-audit-logs", page, pageSize, status, component, searchQuery, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(status !== "all" && { status }),
        ...(component !== "all" && { component }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateRange !== "all" && { dateRange }),
      });
      const res = await fetch(`/api/admin/audit-logs/system?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch system logs");
      return res.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["system-audit-stats", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== "all") params.set("dateRange", dateRange);
      const res = await fetch(`/api/admin/audit-logs/system/stats?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const events: SystemEvent[] = data?.events || [];
  const stats: SystemStats = statsData?.stats || {
    totalEvents: 0,
    successEvents: 0,
    failureEvents: 0,
    warningEvents: 0,
    infoEvents: 0,
    avgResponseTime: 0,
    uptime: 99.9,
    databaseHealth: "healthy",
    cacheHealth: "healthy",
    storageHealth: "healthy",
  };
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const getHealthColor = (status: string) => {
    if (status === "healthy") return "text-green-500";
    if (status === "degraded") return "text-yellow-500";
    return "text-red-500";
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(status !== "all" && { status }),
        ...(component !== "all" && { component }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateRange !== "all" && { dateRange }),
        format: "csv",
      });
      const res = await fetch(`/api/admin/audit-logs/system/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("System logs exported successfully");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Audit Logs" subtitle="Track system events and performance" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
        title="System Audit Logs"
        subtitle="Track system events, API calls, and background jobs"
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
        <StatsCard title="Success Rate" value={`${Math.round((stats.successEvents / stats.totalEvents) * 100)}%`} icon={CheckCircle2} color="green" delay={0.1} />
        <StatsCard title="Failures" value={stats.failureEvents} icon={AlertCircle} color="red" delay={0.2} />
        <StatsCard title="Avg Response" value={`${stats.avgResponseTime}ms`} icon={Clock} color="purple" delay={0.3} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="mt-4 shadow-md rounded-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <p className={cn("text-lg font-semibold", getHealthColor(stats.databaseHealth))}>
                  {stats.databaseHealth}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Redis Cache</p>
                <p className={cn("text-lg font-semibold", getHealthColor(stats.cacheHealth))}>
                  {stats.cacheHealth}
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Storage</p>
                <p className={cn("text-lg font-semibold", getHealthColor(stats.storageHealth))}>
                  {stats.storageHealth}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILURE">Failure</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={component} onValueChange={setComponent}>
              <SelectTrigger>
                <SelectValue placeholder="Component" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="cache">Cache</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="queue">Queue</SelectItem>
                <SelectItem value="websocket">WebSocket</SelectItem>
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
      <Card>
        <CardHeader>
          <CardTitle>System Events</CardTitle>
          <CardDescription>
            Showing {events.length} of {pagination.total} system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(pageSize)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No system events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const Icon = componentIcons[event.component] || Settings;
                  return (
                    <TableRow key={event.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Badge className={statusColors[event.status]}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{event.component}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{event.description}</span>
                      </TableCell>
                      <TableCell>
                        {event.duration ? (
                          <Badge variant="outline" className="text-xs">
                            {event.duration}ms
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
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