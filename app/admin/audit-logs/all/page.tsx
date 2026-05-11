"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  User,
  Server,
  Key,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const severityConfig: Record<string, { icon: any; className: string }> = {
  INFO: { icon: Info, className: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
  WARNING: { icon: AlertTriangle, className: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
  ERROR: { icon: AlertCircle, className: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
  CRITICAL: { icon: ShieldAlert, className: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" },
};

const entityIcons: Record<string, any> = {
  USER: Users,
  ROLE: Key,
  PERMISSION: Key,
  SYSTEM: Server,
  SECURITY: ShieldAlert,
  TICKET: Activity,
};

export default function AuditLogsUsersRedirect() {
 
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState({
    action: "",
    entityType: "ALL",
    severity: "ALL",
    startDate: "",
    endDate: "",
  });

  // Fetch audit logs
  const { data, isLoading , refetch} = useQuery({
    queryKey: ["admin-audit-logs", page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType !== "ALL") params.set("entityType", filters.entityType);
      if (filters.severity !== "ALL") params.set("severity", filters.severity);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  const clearFilters = () => {
    setFilters({ action: "", entityType: "ALL", severity: "ALL", startDate: "", endDate: "" });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            System-wide audit trail of all admin actions and changes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.entityType}
          onValueChange={(v) => setFilters({ ...filters, entityType: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Entities</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ROLE">Role</SelectItem>
            <SelectItem value="PERMISSION">Permission</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
            <SelectItem value="SECURITY">Security</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.severity}
          onValueChange={(v) => setFilters({ ...filters, severity: v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-[150px]"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <Input
          type="date"
          className="w-[150px]"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
        <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
          <Filter className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Logs Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Severity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead className="w-[160px]">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => {
                const sev = severityConfig[log.severity] || severityConfig.INFO;
                const SevIcon = sev.icon;
                const EntityIcon = entityIcons[log.entityType] || Activity;

                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge className={`gap-1 ${sev.className}`}>
                        <SevIcon className="h-3 w-3" />
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{log.action}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <EntityIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">
                            {log.entityId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{log.user.name || log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.changes ? (
                        <pre className="text-xs bg-muted p-1.5 rounded max-w-[200px] overflow-hidden text-ellipsis">
                          {JSON.stringify(log.changes).slice(0, 60)}...
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {logs.length} of {pagination.total} logs
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
