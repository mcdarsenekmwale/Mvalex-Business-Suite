// app/(admin)/audit-logs/users/page.tsx (Updated to be fully functional)
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Download,
  RefreshCw,
  UserPlus,
  UserX,
  Shield,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { format } from "date-fns";
import { toast } from "sonner";

export default function UserAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year" | "all">("week");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user-audit-logs", page, pageSize, action, searchQuery, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(action !== "all" && { action }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateRange !== "all" && { dateRange }),
      });
      const res = await fetch(`/api/admin/audit-logs/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch user audit logs");
      return res.json();
    },
  });

  const events = data?.events || [];
  const stats = data?.stats || {
    totalEvents: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    suspended: 0,
    activated: 0,
    roleChanges: 0,
  };
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(action !== "all" && { action }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateRange !== "all" && { dateRange }),
        format: "csv",
      });
      const res = await fetch(`/api/admin/audit-logs/users/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("User audit logs exported successfully");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Audit Logs" subtitle="Track user account changes" />
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
        title="User Audit Logs"
        subtitle="Track user account creation, updates, deletions, and role changes"
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
        <StatsCard title="Total Changes" value={stats.totalEvents} icon={Users} color="blue" delay={0} />
        <StatsCard title="Users Created" value={stats.created} icon={UserPlus} color="green" delay={0.1} />
        <StatsCard title="Users Deleted" value={stats.deleted} icon={UserX} color="red" delay={0.2} />
        <StatsCard title="Role Changes" value={stats.roleChanges} icon={Shield} color="purple" delay={0.3} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">User Created</SelectItem>
                <SelectItem value="UPDATE">User Updated</SelectItem>
                <SelectItem value="DELETE">User Deleted</SelectItem>
                <SelectItem value="SUSPEND">User Suspended</SelectItem>
                <SelectItem value="ACTIVATE">User Activated</SelectItem>
                <SelectItem value="ROLE_CHANGE">Role Changed</SelectItem>
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
          <CardTitle>User Activity Log</CardTitle>
          <CardDescription>
            Showing {events.length} of {pagination.total} user activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Changes</TableHead>
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
                    No user audit events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event: any) => (
                  <TableRow key={event.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Badge variant="outline">{event.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={event.performedBy?.avatarUrl} />
                          <AvatarFallback>
                            {(event.performedBy?.name || event.performedBy?.email || "S").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{event.performedBy?.name || "System"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={event.targetUser?.avatarUrl} />
                          <AvatarFallback>
                            {(event.targetUser?.name || event.targetUser?.email || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{event.targetUser?.name || event.targetUser?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        {event.changes?.map((change: any, idx: number) => (
                          <div key={idx} className="text-xs">
                            <span className="text-muted-foreground">{change.field}:</span>{" "}
                            {change.oldValue && <span className="line-through text-red-500 mr-1">{change.oldValue}</span>}
                            {change.newValue && <span className="text-green-500">{change.newValue}</span>}
                          </div>
                        ))}
                      </div>
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
                ))
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