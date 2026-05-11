"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserCheck, UserX, Clock, Activity, RefreshCw, MoreVertical, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Agent = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  availability: {
    status: string;
    currentLoad: number;
    capacity: number;
    lastActiveAt: string;
  } | null;
  assignedTickets: Array<{ id: string; status: string; priority: string }>;
};

export default function AgentManagementPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-agents-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/agents/dashboard");
      if (!res.ok) throw new Error("Failed to fetch agent data");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ agentId, status }: { agentId: string; status: string }) => {
      const res = await fetch("/api/admin/agents/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Agent status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-agents-dashboard"] });
    },
    onError: () => toast.error("Could not update status"),
  });

  const agents: Agent[] = data?.agents || [];
  const stats = data?.stats || {
    totalAgents: 0,
    onlineAgents: 0,
    busyAgents: 0,
    awayAgents: 0,
    offlineAgents: 0,
    totalAssignedTickets: 0,
    averageLoad: 0,
  };

  const filteredAgents = agents.filter((agent) => {
    if (statusFilter === "all") return true;
    return agent.availability?.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-500";
      case "BUSY":
        return "bg-red-500";
      case "AWAY":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600 bg-red-100";
      case "HIGH":
        return "text-orange-600 bg-orange-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-green-600 bg-green-100";
    }
  };

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
          <p className="text-muted-foreground text-sm">Monitor agent availability, workload, and ticket routing</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Agents" value={stats.totalAgents} icon={<Users className="h-5 w-5 text-blue-500" />} />
        <StatCard label="Online" value={stats.onlineAgents} icon={<UserCheck className="h-5 w-5 text-green-500" />} />
        <StatCard label="Busy" value={stats.busyAgents} icon={<Activity className="h-5 w-5 text-red-500" />} />
        <StatCard label="Away" value={stats.awayAgents} icon={<Clock className="h-5 w-5 text-yellow-500" />} />
        <StatCard label="Total Tickets" value={stats.totalAssignedTickets} icon={<MessageSquare className="h-5 w-5 text-purple-500" />} />
        <StatCard label="Avg Load" value={Number(stats.averageLoad).toFixed(1)} icon={<TrendingUp className="h-5 w-5 text-cyan-500" />} />
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Agents</SelectItem>
          <SelectItem value="online">Online</SelectItem>
          <SelectItem value="busy">Busy</SelectItem>
          <SelectItem value="away">Away</SelectItem>
          <SelectItem value="offline">Offline</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardHeader>
          <CardTitle>Agent List</CardTitle>
          <CardDescription>View and manage assignments and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workload</TableHead>
                <TableHead>Assigned Tickets</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={agent.avatarUrl || undefined} />
                        <AvatarFallback>{(agent.name || agent.email).charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{agent.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.availability?.status || "OFFLINE")}`} />
                      <span className="text-sm">{agent.availability?.status || "OFFLINE"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{agent.availability?.currentLoad || 0} / {agent.availability?.capacity || 5}</span>
                        <span className="text-muted-foreground">
                          {Math.round(((agent.availability?.currentLoad || 0) / (agent.availability?.capacity || 5)) * 100)}%
                        </span>
                      </div>
                      <Progress value={((agent.availability?.currentLoad || 0) / (agent.availability?.capacity || 5)) * 100} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.assignedTickets.slice(0, 3).map((ticket) => (
                        <Badge key={ticket.id} className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      ))}
                      {agent.assignedTickets.length > 3 && <Badge variant="outline">+{agent.assignedTickets.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {agent.availability?.lastActiveAt
                      ? formatDistanceToNow(new Date(agent.availability.lastActiveAt), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ agentId: agent.id, status: "ONLINE" })}>
                          <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                          Set Online
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ agentId: agent.id, status: "BUSY" })}>
                          <Activity className="mr-2 h-4 w-4 text-red-500" />
                          Set Busy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ agentId: agent.id, status: "AWAY" })}>
                          <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                          Set Away
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ agentId: agent.id, status: "OFFLINE" })}>
                          <UserX className="mr-2 h-4 w-4 text-gray-500" />
                          Set Offline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
