"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
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
import UserActivityDetailsSheet from "@/components/admin/users/UserActivityDetailsSheet";

export default function UserActivityAdminPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");

  // Fetch user activity data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-user-activity", page, limit, userId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (userId) params.set("userId", userId);

      const res = await fetch(`/api/admin/users/activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  const activities = data?.activities || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          User Activity
        </h1>
        <p className="text-muted-foreground text-sm">
          Monitor user actions across the platform
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by any keywords..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Time</TableHead>
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
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No activities found
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity: any) => (
                <TableRow key={activity.id} 
                className="cursor-pointer"
                onClick={() => {
                  setUserId(activity.user?.id || "");
                  setPage(1);
                }}
                
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{activity.user?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{activity.user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{activity.actionType}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{activity.entityType}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{activity.description || activity.action}</span>
                  </TableCell>
                  <TableCell>
                    {activity.creditsUsed > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <CreditCard className="h-3 w-3" />
                        {activity.creditsUsed}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(activity.createdAt), "MMM d, HH:mm")}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {activities.length} of {pagination.total} activities
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

      {/* Display user activity details sheet/offcanvas */}
      {userId !== "" && (
        <UserActivityDetailsSheet 
          open={userId !== "" ? true : false} 
          userId={userId} 
          onClose={() => setUserId("")} 
        />
      )}
    </div>
  );
}
