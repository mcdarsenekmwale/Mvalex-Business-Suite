// components/admin/users/UserActivityDetailsSheet.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Clock,
  Download,
  FileText,
  Palette,
  CreditCard,
  Bot,
  User,
  Globe,
  Smartphone,
  Monitor,
  TrendingUp,
  TrendingDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";

interface UserActivityDetailsSheetProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  status: string;
  creditsBalance: number;
  createdAt: string;
  lastLogin?: string;
}

interface Activity {
  id: string;
  action: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  creditsUsed: number;
  creditsBefore: number;
  creditsAfter: number;
  description: string | null;
  metadata: any;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ActivityStats {
  totalActivities: number;
  totalCreditsUsed: number;
  averageCreditsPerAction: number;
  mostFrequentAction: string;
  mostActiveDay: string;
  activityByType: Record<string, number>;
  creditsByAction: Record<string, number>;
  dailyActivity: Array<{ date: string; count: number; credits: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

const actionIcons: Record<string, any> = {
  CREATE_BUSINESS_CARD: FileText,
  EDIT_BUSINESS_CARD: FileText,
  DELETE_BUSINESS_CARD: FileText,
  CREATE_INVOICE: CreditCard,
  EDIT_INVOICE: CreditCard,
  DELETE_INVOICE: CreditCard,
  GENERATE_LOGO: Palette,
  EXPORT_FILE: Download,
  AI_CHAT_MESSAGE: Bot,
  AI_DESIGN_SUGGESTION: Bot,
  LOGIN: User,
  LOGOUT: User,
  UPDATE_PROFILE: User,
};

const actionColors: Record<string, string> = {
  CREATE_BUSINESS_CARD: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  EDIT_BUSINESS_CARD: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
  CREATE_INVOICE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  GENERATE_LOGO: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  EXPORT_FILE: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  AI_CHAT_MESSAGE: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
  LOGIN: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  UPDATE_PROFILE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400",
};

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export default function UserActivityDetailsSheet({ open, userId, onClose }: UserActivityDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">("month");

  // Fetch user details
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: open && !!userId,
  });

  // Fetch user activities
  const { data: activitiesData, isLoading: activitiesLoading, refetch } = useQuery({
    queryKey: ["admin-user-activities", userId, dateRange, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId,
        dateRange,
        ...(filterType !== "all" && { actionType: filterType }),
        limit: "100",
      });
      const res = await fetch(`/api/admin/users/${userId}/activities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
    enabled: open && !!userId,
  });

  // Fetch user activity stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-user-activity-stats", userId, dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/activities/stats?dateRange=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: open && !!userId,
  });

  const user: User = userData?.user;
  const activities: Activity[] = activitiesData?.activities || [];
  const stats: ActivityStats = statsData?.stats || {
    totalActivities: 0,
    totalCreditsUsed: 0,
    averageCreditsPerAction: 0,
    mostFrequentAction: "N/A",
    mostActiveDay: "N/A",
    activityByType: {},
    creditsByAction: {},
    dailyActivity: [],
    hourlyDistribution: [],
  };

  const filteredActivities = activities.filter(activity =>
    activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Prepare chart data
  const dailyChartData = stats.dailyActivity.map(day => ({
    ...day,
    date: format(new Date(day.date), "MMM dd"),
  }));

  const hourlyChartData = stats.hourlyDistribution.map(hour => ({
    hour: `${hour.hour}:00`,
    count: hour.count,
  }));

  const activityPieData = Object.entries(stats.activityByType).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  const creditsPieData = Object.entries(stats.creditsByAction).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  const isLoading = userLoading || activitiesLoading || statsLoading;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="bg-background z-10 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            User Activity Details
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Comprehensive activity log and analytics for the user
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="mt-6 space-y-6">
            {/* User Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{user?.name || "N/A"}</h2>
                      <Badge variant={user?.status === "ACTIVE" ? "default" : "destructive"}>
                        {user?.status || "Unknown"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>{user?.creditsBalance || 0} credits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Joined {format(new Date(user?.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      {user?.lastLogin && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Last login {format(new Date(user.lastLogin), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Activities</p>
                      <p className="text-2xl font-bold">{stats.totalActivities}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Credits Used</p>
                      <p className="text-2xl font-bold">{stats.totalCreditsUsed}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Credits/Action</p>
                      <p className="text-2xl font-bold">{stats.averageCreditsPerAction}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Most Active</p>
                      <p className="text-xl font-bold truncate">{stats.mostFrequentAction}</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Activity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activityPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={activityPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {activityPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No activity data</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Credit Usage by Action</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {creditsPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={creditsPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {creditsPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No credit data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Daily Activity Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            name="Activities"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="credits"
                            stroke="#10b981"
                            name="Credits"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No trend data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activities Tab */}
              <TabsContent value="activities" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search activities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="EDIT">Edit</option>
                    <option value="DELETE">Delete</option>
                    <option value="EXPORT">Export</option>
                  </select>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                    <option value="year">Last year</option>
                  </select>
                </div>

                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {filteredActivities.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No activities found</p>
                        </div>
                        ) : (
                        filteredActivities.map((activity, index) => {
                            const Icon = actionIcons[activity.action] || Activity;
                            const colorClass = actionColors[activity.action] || "bg-gray-100 text-gray-700";
                            
                            return (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                            >
                                <div className={`p-2 rounded-lg ${colorClass}`}>
                                <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                    <p className="font-medium text-sm">{activity.action.replace(/_/g, " ")}</p>
                                    {activity.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                        {activity.description}
                                        </p>
                                    )}
                                    </div>
                                    <div className="text-right">
                                    {activity.creditsUsed > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                        -{activity.creditsUsed} credits
                                        </Badge>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                                    </p>
                                    </div>
                                </div>
                                {activity.ipAddress && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <Globe className="h-3 w-3" />
                                    <span>{activity.ipAddress}</span>
                                    {activity.userAgent && (
                                        <>
                                        <span>•</span>
                                        {activity.userAgent.includes("Mobile") ? (
                                            <Smartphone className="h-3 w-3" />
                                        ) : (
                                            <Monitor className="h-3 w-3" />
                                        )}
                                        </>
                                    )}
                                    </div>
                                )}
                                </div>
                            </motion.div>
                            );
                        })
                        )}
                    </div>
                </ScrollArea>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Hourly Activity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hourlyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={hourlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No hourly data available</p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.activityByType)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([action, count]) => (
                            <div key={action} className="flex items-center justify-between text-sm">
                              <span className="capitalize">{action.toLowerCase().replace(/_/g, " ")}</span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Credit Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.creditsByAction)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([action, credits]) => (
                            <div key={action} className="flex items-center justify-between text-sm">
                              <span className="capitalize">{action.toLowerCase().replace(/_/g, " ")}</span>
                              <Badge variant="outline">{credits} cr</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Metadata Tab */}
              <TabsContent value="metadata" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono text-xs">{user?.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Created</span>
                      <span>{format(new Date(user?.createdAt), "PPP 'at' p")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credits Balance</span>
                      <span className="font-semibold">{user?.creditsBalance} credits</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={user?.status === "ACTIVE" ? "default" : "destructive"}>
                        {user?.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Sessions</span>
                      <span>{activities.filter(a => a.action === "LOGIN").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Most Active Day</span>
                      <span>{stats.mostActiveDay}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">First Activity</span>
                      <span>
                        {activities.length > 0
                          ? format(new Date(activities[activities.length - 1].createdAt), "PPP")
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Activity</span>
                      <span>
                        {activities.length > 0
                          ? format(new Date(activities[0].createdAt), "PPP")
                          : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            </div>
          </ScrollArea>
        )}

        <SheetFooter className=" bg-background pt-4 mt-6 border-t text-white">
          <Button onClick={onClose}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}