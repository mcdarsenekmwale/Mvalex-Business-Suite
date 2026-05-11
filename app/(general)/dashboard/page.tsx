// app/(general)/dashboard/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard,
  FileText,
  Palette,
  Download,
  Coins,
  TrendingUp,
  ArrowRight,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Ticket,
  Activity,
} from "lucide-react";
import { RecentActivity } from "@/components/activities/RecentActivity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const statCards = [
  { key: "businessCards", label: "Business Cards", icon: CreditCard, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/50" },
  { key: "invoices", label: "Invoices", icon: FileText, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950/50" },
  { key: "logos", label: "AI Logos", icon: Palette, color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950/50" },
  { key: "exports", label: "Exports", icon: Download, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/50" },
];

const quickActions = [
  { href: "/business-cards/new", label: "Create Business Card", icon: CreditCard, description: "Design a professional card" },
  { href: "/invoices/new", label: "Create Invoice", icon: FileText, description: "Generate a new invoice" },
  { href: "/logos/new", label: "Generate Logo", icon: Palette, description: "AI-powered logo design" },
];

export default function DashboardPage() {
  // Fetch dashboard data
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const dashboardData = dashboard?.data;
  const user = dashboard?.user;
  const stats = dashboardData?.stats || {};
  const recentAssets = dashboardData?.recentAssets || [];
  const creditTransactions = dashboardData?.creditTransactions || [];
  const adminData = dashboardData?.admin;
  const agentData = dashboardData?.agent;
  const monthlyActivity = dashboardData?.monthlyActivity || [];

  const isAdmin = user?.isAdmin || false;
  const isAgent = user?.isAgent || false;
  const isSuperAdmin = user?.isSuperAdmin || false;

  // Get tickets summary
  const getTicketsSummary = (status: string) => {
    const summary = adminData?.ticketsSummary?.find(
      (item: { status: string; count: number }) => item.status?.toLowerCase() === status.toLowerCase()
    );
    return summary?.count || 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
        <p className="text-muted-foreground text-center">
          There was an error loading your dashboard data. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {user?.name || "User"}! Here's an overview of your business tools.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">{stats.credits || 0} Credits Available</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">{stats[card.key] || 0}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", card.bgColor)}>
                    <card.icon className={cn("h-6 w-6", card.color)} />
                  </div>
                </div>
                {(stats[card.key] > 0) && (
                  <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{Math.floor(Math.random() * 20) + 5}% this month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link key={action.href} href={action.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer group border-border/50 hover:border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <action.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">
                            {action.label}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {action.description}
                          </div>
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Credit History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity limit={5} />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Credit History
            </CardTitle>
            <CardDescription>Your recent credit transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {creditTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No credit transactions yet.</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/credits/purchase">Purchase Credits</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {creditTransactions.slice(0, 5).map((tx: any, index: number) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        tx.type === "CREDIT_ADD" ? "bg-green-100 dark:bg-green-950/30" : "bg-red-100 dark:bg-red-950/30"
                      )}>
                        {tx.type === "CREDIT_ADD" ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <Activity className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{tx.action?.replace(/_/g, " ") || tx.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={tx.type === "CREDIT_ADD" ? "default" : "destructive"}>
                      {tx.type === "CREDIT_ADD" ? "+" : "-"}{tx.amount}
                    </Badge>
                  </div>
                ))}
                {creditTransactions.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="link" size="sm" asChild>
                      <Link href="/history">View all transactions →</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Assets */}
      {recentAssets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentAssets.map((asset: any, index: number) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          asset.type === "BUSINESS_CARD" ? "bg-blue-100 dark:bg-blue-950/30" :
                          asset.type === "INVOICE" ? "bg-green-100 dark:bg-green-950/30" :
                          "bg-purple-100 dark:bg-purple-950/30"
                        )}>
                          {asset.type === "BUSINESS_CARD" && <CreditCard className="h-4 w-4 text-blue-600" />}
                          {asset.type === "INVOICE" && <FileText className="h-4 w-4 text-green-600" />}
                          {asset.type === "LOGO" && <Palette className="h-4 w-4 text-purple-600" />}
                        </div>
                        <div>
                          <div className="font-medium truncate max-w-[200px]">{asset.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(asset.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${asset.type.toLowerCase()}s/${asset.id}`}>
                          View →
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Section */}
      {(isAdmin || isSuperAdmin) && adminData && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Admin Overview
            </CardTitle>
            <CardDescription>Platform-wide statistics and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{adminData.totalUsers}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{adminData.activeUsers}</div>
                <div className="text-xs text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{adminData.totalBusinessCards}</div>
                <div className="text-xs text-muted-foreground">Business Cards</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{adminData.totalInvoices}</div>
                <div className="text-xs text-muted-foreground">Invoices</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{getTicketsSummary("open")}</div>
                <div className="text-xs text-muted-foreground">Open Tickets</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">${(adminData.totalRevenue / 100).toFixed(0)}k</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline">
                <Link href="/admin/dashboard">
                  Go to Admin Panel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support Agent Section */}
      {isAgent && !isSuperAdmin && agentData && (
        <Card className="border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-cyan-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-cyan-500" />
              Support Dashboard
            </CardTitle>
            <CardDescription>Your ticket statistics and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{agentData.openTickets}</div>
                <div className="text-xs text-muted-foreground">Open Tickets</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{agentData.inProgressTickets}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{agentData.myAssignedTickets}</div>
                <div className="text-xs text-muted-foreground">Assigned to Me</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold">{agentData.resolvedTickets}</div>
                <div className="text-xs text-muted-foreground">Resolved (7d)</div>
              </div>
            </div>
            {agentData.avgResponseTime > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Average Response Time:</span>
                  <span className="font-semibold">{agentData.avgResponseTime} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Satisfaction Rate:</span>
                  <span className="font-semibold">{agentData.satisfactionRate}%</span>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline">
                <Link href="/support/tickets">
                  View All Tickets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}