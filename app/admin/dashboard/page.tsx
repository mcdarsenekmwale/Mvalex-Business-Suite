// app/(admin)/dashboard/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CreditCard,
  HelpCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Palette,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { ChartCard } from "@/components/admin/shared/ChartCard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Types
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalBusinessCards: number;
  totalInvoices: number;
  totalLogos: number;
  openTickets: number;
  inProgressTickets: number;
  totalExports: number;
  totalCreditsUsed: number;
  newUsersThisMonth: number;
  newCardsThisMonth: number;
  newInvoicesThisMonth: number;
  newLogosThisMonth: number;
}

interface UserGrowthPoint {
  name: string;
  users: number;
  active: number;
}

interface ActivityPoint {
  name: string;
  cards: number;
  invoices: number;
  logos: number;
}

interface RoleDistribution {
  name: string;
  value: number;
  color: string;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  status: string;
  creditsBalance: number;
  createdAt: string;
}

interface RecentTicket {
  id: string;
  subject: string;
  user: { name: string | null; email: string };
  status: string;
  priority: string;
  createdAt: string;
}

// API response types
interface StatsResponse {
  stats: DashboardStats;
  userGrowth: UserGrowthPoint[];
  weeklyActivity: ActivityPoint[];
  roleDistribution: RoleDistribution[];
}

interface UsersResponse {
  users: RecentUser[];
  total: number;
  page: number;
  totalPages: number;
}

interface TicketsResponse {
  tickets: RecentTicket[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminDashboardPage() {
  // Fetch dashboard stats
  const { data: statsResponse, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent users
  const { data: usersResponse, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ["admin-dashboard-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?limit=5&sortBy=createdAt&sortOrder=desc");
      if (!res.ok) throw new Error("Failed to fetch recent users");
      return res.json();
    },
  });

  // Fetch recent tickets
  const { data: ticketsResponse, isLoading: ticketsLoading } = useQuery<TicketsResponse>({
    queryKey: ["admin-dashboard-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tickets?limit=5&sortBy=createdAt&sortOrder=desc");
      if (!res.ok) throw new Error("Failed to fetch recent tickets");
      return res.json();
    },
  });

  const stats = statsResponse?.stats || {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    totalBusinessCards: 0,
    totalInvoices: 0,
    totalLogos: 0,
    openTickets: 0,
    inProgressTickets: 0,
    totalExports: 0,
    totalCreditsUsed: 0,
    newUsersThisMonth: 0,
    newCardsThisMonth: 0,
    newInvoicesThisMonth: 0,
    newLogosThisMonth: 0,
  };

  const userGrowthData = statsResponse?.userGrowth || [];
  const activityData = statsResponse?.weeklyActivity || [];
  const roleDistribution = statsResponse?.roleDistribution || [];
  const users: RecentUser[] = usersResponse?.users || [];
  const tickets: RecentTicket[] = ticketsResponse?.tickets || [];

  const isLoading = statsLoading || usersLoading || ticketsLoading;

  //if its zero then set the denominator to 1 to avoid division by zero error
  const denominatorUsers = ((stats.totalUsers as number) - (stats.newUsersThisMonth as number)) || 1;
  const denominatorInvoices = ((stats.totalInvoices as number) - (stats.newInvoicesThisMonth as number)) || 1;
  const denominatorLogos = ((stats.totalLogos as number) - (stats.newLogosThisMonth as number)) || 1;
  const denominatorBusiness = ((stats.totalBusinessCards as number) - (stats.newCardsThisMonth as number)) || 1;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" subtitle="Loading platform metrics..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview and key metrics"
        action={
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 bg-primary text-white"
            onClick={() => {
              // Handle click event
            }}>
            <Clock className="h-4 w-4" />
            Last 30 days
          </Button>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={Users}
          color="blue"
          trend={stats.newUsersThisMonth > 0 ? "up" : "down"}
          trendValue={`+${(((stats.newUsersThisMonth as number) / denominatorUsers) * 100).toFixed(1)}%`}
          description="vs last month"
          delay={0}
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers || 0}
          icon={CheckCircle2}
          color="green"
          trend="up"
          trendValue={`${((stats.activeUsers / stats.totalUsers) * 100).toFixed(0)}%`}
          description="of total users"
          delay={0.1}
        />
        <StatsCard
          title="Business Cards"
          value={stats.totalBusinessCards || 0}
          icon={CreditCard}
          color="purple"
          trend={stats.newCardsThisMonth > 0 ? "up" : "down"}
          trendValue={`+${(((stats.newCardsThisMonth as number) / denominatorBusiness) * 100).toFixed(1)}%`}
          description="this month"
          delay={0.2}
        />
        <StatsCard
          title="Open Tickets"
          value={stats.openTickets || 0}
          icon={HelpCircle}
          color="amber"
          trend={stats.openTickets > stats.inProgressTickets ? "up" : "down"}
          trendValue={`${stats.openTickets} open, ${stats.inProgressTickets} in-progress`}
          description="needs attention"
          delay={0.3}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Invoices" 
          value={stats.totalInvoices} 
          icon={FileText} 
          color="cyan" 
          trend={stats.newInvoicesThisMonth > 0 ? "up" : "down"}
          trendValue={`+${(((stats.newInvoicesThisMonth as number) / denominatorInvoices) * 100).toFixed(1)}%`}
          description="this month"
          delay={0.15} 
        />
        <StatsCard 
          title="AI Logos" 
          value={stats.totalLogos} 
          icon={Palette} 
          color="rose" 
          trend={stats.newLogosThisMonth > 0 ? "up" : "down"}
          trendValue={`+${(((stats.newLogosThisMonth as number) / denominatorLogos) * 100).toFixed(1)}%`}
          description="this month"
          delay={0.25} 
        />
        <StatsCard 
          title="Total Exports" 
          value={stats.totalExports} 
          icon={TrendingUp} 
          color="green" 
          description="all time"
          delay={0.35} 
        />
        <StatsCard 
          title="Credits Used" 
          value={stats.totalCreditsUsed} 
          icon={AlertCircle} 
          color="rose" 
          description="total spent"
          delay={0.45} 
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard 
          title="User Growth" 
          subtitle="Total vs Active users over time" 
          className="lg:col-span-2" 
          delay={0.2}
        >
          {userGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2} fill="url(#colorActive)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground">
              No user growth data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="User Distribution" subtitle="By role and status" delay={0.3}>
          {roleDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {roleDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground">
              No user distribution data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <ChartCard title="Weekly Activity" subtitle="Assets created by type" delay={0.4}>
        {activityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activityData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar dataKey="cards" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Business Cards" />
              <Bar dataKey="invoices" fill="#10b981" radius={[4, 4, 0, 0]} name="Invoices" />
              <Bar dataKey="logos" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="AI Logos" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            No activity data available
          </div>
        )}
      </ChartCard>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Users</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Latest registered accounts</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <a href="/admin/users">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
          <div className="p-0">
            {users.length > 0 ? (
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 dark:border-slate-800/60">
                    <TableHead className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">User</TableHead>
                    <TableHead className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Status</TableHead>
                    <TableHeader className="text-right px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Credits</TableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-b border-slate-50 dark:border-slate-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name || "N/A"}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <StatusBadge status={user.status} size="sm" />
                      </TableCell>
                      <TableCell className="px-6 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.creditsBalance || 0}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Tickets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Tickets</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Latest support requests</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <a href="/admin/tickets">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
          <div className="p-0">
            {tickets.length > 0 ? (
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 dark:border-slate-800/60">
                    <TableHead className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Subject</TableHead>
                    <TableHead className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Status</TableHead>
                    <TableHead className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="border-b border-slate-50 dark:border-slate-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell className="px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">{ticket.subject}</p>
                          <p className="text-xs text-slate-500">{ticket.user?.name || ticket.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <StatusBadge status={ticket.status} size="sm" />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <StatusBadge 
                          status={ticket.priority === "high" ? "High" : ticket.priority === "medium" ? "Medium" : "Low"} 
                          size="sm" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tickets found
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}