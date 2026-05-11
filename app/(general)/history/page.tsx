// app/(general)/(dashboard)/history/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  CreditCard,
  Palette,
  Bell,
  User,
  Mail,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Award,
  BarChart3,
  PieChart,
  LineChart,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
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
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Types
interface Activity {
  id: string;
  action: string;
  actionType: string;
  entityType: string;
  entityId: string;
  creditsUsed: number;
  creditsBefore: number;
  creditsAfter: number;
  description: string;
  metadata: any;
  createdAt: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: "CREDIT_ADD" | "CREDIT_DEDUCT";
  action: string;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
}

interface ExportHistory {
  id: string;
  assetType: string;
  format: string;
  fileUrl: string;
  createdAt: string;
}

interface UserStats {
  totalActivities: number;
  totalCreditsUsed: number;
  totalCreditsAdded: number;
  currentBalance: number;
  businessCardsCount: number;
  invoicesCount: number;
  logosCount: number;
  exportsCount: number;
  activitiesByType: Record<string, number>;
  creditsByAction: Record<string, number>;
  weeklyActivity: Array<{ date: string; count: number; credits: number }>;
}

const actionIcons: Record<string, any> = {
  CREATE_BUSINESS_CARD: FileText,
  EDIT_BUSINESS_CARD: FileText,
  DELETE_BUSINESS_CARD: FileText,
  CREATE_INVOICE: FileText,
  EDIT_INVOICE: FileText,
  DELETE_INVOICE: FileText,
  GENERATE_LOGO: Palette,
  EXPORT_FILE: Download,
  ADD_CREDITS: TrendingUp,
  USE_CREDITS: TrendingDown,
  VIEW_ACTIVITY: Eye,
  LOGIN: User,
  LOGOUT: User,
  UPDATE_PROFILE: User,
  CHANGE_PASSWORD: User,
  CREATE_TICKET: Activity,
  RESOLVE_TICKET: Activity,
};

const actionColors: Record<string, string> = {
  CREATE_BUSINESS_CARD: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  EDIT_BUSINESS_CARD: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
  DELETE_BUSINESS_CARD: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  CREATE_INVOICE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  GENERATE_LOGO: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  EXPORT_FILE: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  ADD_CREDITS: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  USE_CREDITS: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
  LOGIN: "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
  UPDATE_PROFILE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400",
};

const actionLabels: Record<string, string> = {
  CREATE_BUSINESS_CARD: "Created Business Card",
  EDIT_BUSINESS_CARD: "Edited Business Card",
  DELETE_BUSINESS_CARD: "Deleted Business Card",
  CREATE_INVOICE: "Created Invoice",
  EDIT_INVOICE: "Edited Invoice",
  DELETE_INVOICE: "Deleted Invoice",
  GENERATE_LOGO: "Generated AI Logo",
  EXPORT_FILE: "Exported File",
  ADD_CREDITS: "Added Credits",
  USE_CREDITS: "Used Credits",
  LOGIN: "Logged In",
  LOGOUT: "Logged Out",
  UPDATE_PROFILE: "Updated Profile",
  CHANGE_PASSWORD: "Changed Password",
  CREATE_TICKET: "Created Support Ticket",
  RESOLVE_TICKET: "Resolved Ticket",
};

const entityLabels: Record<string, string> = {
  BUSINESS_CARD: "Business Card",
  INVOICE: "Invoice",
  LOGO: "Logo",
  EXPORT: "Export",
  USER: "User Account",
  TICKET: "Support Ticket",
};

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year" | "all">("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("activities");

  // Fetch activities history
  const { data: activitiesData, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
    queryKey: ["user-activities", page, limit, filterType, filterAction, dateRange, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterType !== "all" && { entityType: filterType }),
        ...(filterAction !== "all" && { action: filterAction }),
        ...(dateRange !== "all" && { dateRange }),
        ...(searchQuery && { search: searchQuery }),
      });
      const res = await fetch(`/api/user/activities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  // Fetch credit transactions
  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ["user-credits-history", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/user/credits/history?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch credit history");
      return res.json();
    },
  });

  // Fetch user stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
  });

  // Fetch export history
  const { data: exportsData, isLoading: exportsLoading } = useQuery({
    queryKey: ["user-exports", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/user/exports?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch export history");
      return res.json();
    },
  });

  const activities = activitiesData?.activities || [];
  const totalActivities = activitiesData?.total || 0;
  const totalPages = Math.ceil(totalActivities / limit);

  const credits = creditsData?.transactions || [];

  const exports_history = exportsData?.exports || [];

  const stats: UserStats = statsData?.stats || {
    totalActivities: 0,
    totalCreditsUsed: 0,
    totalCreditsAdded: 0,
    currentBalance: 0,
    businessCardsCount: 0,
    invoicesCount: 0,
    logosCount: 0,
    exportsCount: 0,
    activitiesByType: {},
    creditsByAction: {},
    weeklyActivity: [],
  };

  // Prepare chart data
  const weeklyChartData = stats.weeklyActivity.map(item => ({
    ...item,
    date: format(new Date(item.date), "EEE, MMM d"),
  }));

  const activitiesPieData = Object.entries(stats.activitiesByType).map(([name, value]) => ({
    name: entityLabels[name as keyof typeof entityLabels] || name,
    value,
  }));

  const creditsPieData = Object.entries(stats.creditsByAction).map(([name, value]) => ({
    name: actionLabels[name as keyof typeof actionLabels] || name,
    value,
  }));

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

  const handleExportData = async () => {
    try {
      const res = await fetch("/api/user/activities/export", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to export data");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `history-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("History exported successfully");
    } catch (error) {
      toast.error("Failed to export history");
    }
  };


  const getCreditColor = (credits: number) => {
    if (credits > 0) return "text-green-600 dark:text-green-400";
    if (credits < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const isLoading = activitiesLoading || creditsLoading || exportsLoading || statsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Activity History
          </h1>
          <p className="text-muted-foreground text-sm">
            Track your activities, credit usage, and exports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchActivities()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-md shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.currentBalance}</div>
              <div className="p-2 bg-primary/10 rounded-full">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                +{stats.totalCreditsAdded}
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                {stats.totalCreditsUsed}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalActivities}</div>
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assets Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-3 w-3 text-blue-500" />
                  <span>{stats.businessCardsCount} Cards</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-3 w-3 text-emerald-500" />
                  <span>{stats.invoicesCount} Invoices</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="h-3 w-3 text-purple-500" />
                  <span>{stats.logosCount} Logos</span>
                </div>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.exportsCount}</div>
              <div className="p-2 bg-orange-500/10 rounded-full">
                <Download className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-md shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Weekly Activity
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Your activity and credit usage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyChartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  fill="url(#colorCount)"
                  name="Activities"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="credits"
                  stroke="#10b981"
                  fill="url(#colorCredits)"
                  name="Credits Used"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Activity Distribution
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Breakdown by type and credits</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="activities" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activities">By Activity Type</TabsTrigger>
                <TabsTrigger value="credits">By Credit Usage</TabsTrigger>
              </TabsList>
              <TabsContent value="activities" className="pt-4">
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={activitiesPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {activitiesPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="credits" className="pt-4">
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={creditsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {creditsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-md shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BUSINESS_CARD">Business Cards</SelectItem>
                <SelectItem value="INVOICE">Invoices</SelectItem>
                <SelectItem value="LOGO">Logos</SelectItem>
                <SelectItem value="EXPORT">Exports</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="EDIT">Edit</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
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

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="activities">
            <Activity className="h-4 w-4 mr-2" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="credits">
            <CreditCard className="h-4 w-4 mr-2" />
            Credits
          </TabsTrigger>
          <TabsTrigger value="exports">
            <Download className="h-4 w-4 mr-2" />
            Exports
          </TabsTrigger>
        </TabsList>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                Showing {activities.length} of {totalActivities} activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No activities found</h3>
                  <p className="text-muted-foreground">
                    Start creating business cards, invoices, or logos to see your activity here.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {activities.map((activity: Activity, index: number) => {
                      const Icon = actionIcons[activity.action] || Activity;
                      const colorClass = actionColors[activity.action] || actionColors.LOGIN;
                      
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className={`p-2 rounded-full ${colorClass}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <p className="font-medium">
                                  {actionLabels[activity.action] || activity.action}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.description || `${actionLabels[activity.action]} successfully`}
                                </p>
                                {activity.metadata?.details && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {activity.metadata.details}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {activity.creditsUsed !== 0 && (
                                  <Badge variant={activity.creditsUsed > 0 ? "default" : "destructive"}>
                                    {activity.creditsUsed > 0 ? "+" : ""}{activity.creditsUsed} credits
                                  </Badge>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(activity.createdAt), "PPP 'at' p")}
                                </p>
                              </div>
                            </div>
                            {activity.creditsBefore !== undefined && (
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Before: {activity.creditsBefore} credits</span>
                                <ArrowUpRight className="h-3 w-3" />
                                <span>After: {activity.creditsAfter} credits</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle>Credit Transaction History</CardTitle>
              <CardDescription>
                Track your credit usage and purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creditsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : credits.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No credit transactions</h3>
                  <p className="text-muted-foreground">
                    Your credit transactions will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map((transaction: CreditTransaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === "CREDIT_ADD" ? "default" : "destructive"}>
                            {transaction.type === "CREDIT_ADD" ? "Added" : "Used"}
                          </Badge>
                        </TableCell>
                        <TableCell className={getCreditColor(transaction.amount)}>
                          {transaction.type === "CREDIT_ADD" ? "+" : ""}{transaction.amount}
                        </TableCell>
                        <TableCell>{transaction.balanceAfter}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description || actionLabels[transaction.action] || transaction.action}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exports Tab */}
        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>
                Files you've exported from the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exportsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : exports_history.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No exports yet</h3>
                  <p className="text-muted-foreground">
                    Export business cards, invoices, or logos to see them here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exports_history.map((exportItem: ExportHistory) => (
                      <TableRow key={exportItem.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {entityLabels[exportItem.assetType as keyof typeof entityLabels] || exportItem.assetType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{exportItem.format}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(exportItem.createdAt), "PPP 'at' p")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(exportItem.fileUrl, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}