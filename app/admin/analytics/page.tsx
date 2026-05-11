"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Activity,
  Download,
  DollarSign,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { ChartCard } from "@/components/admin/shared/ChartCard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { TableHeader, TableHead, TableBody, TableRow, TableCell, Table } from "@/components/ui/table";
import { AnalyticsLoadingState } from "@/components/admin/analytics/AnalyticsLoadingState";

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const stats = data?.stats || {};

   if (isLoading) {
    return <AnalyticsLoadingState />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Failed to load analytics</h3>
          <p className="text-muted-foreground">Please try again later</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Deep insights into platform performance"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[7, 30, 90].map((d, index) => (
                <Button
                  key={d + index}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === d
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400"
                  }`}
                >
                  {d}D
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 bg-primary text-white">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={stats.totalUsers || 0} icon={Users} color="blue" trend="up" trendValue="+12.5%" delay={0} />
        <StatsCard title="MRR" value={`$${stats.mrr || 0}`} icon={DollarSign} color="green" trend="up" trendValue="+18.2%" delay={0.1} />
        <StatsCard title="Active Today" value={stats.activeUsers || 0} icon={Activity} color="purple" trend="up" trendValue="+5.4%" delay={0.2} />
        <StatsCard title="Credit Consumed" value={stats.totalCreditsConsumed || 0} icon={CreditCard} color="amber" trend="up" trendValue="+22.1%" delay={0.3} />
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Overview" subtitle="MRR, ARR & Monthly Revenue" delay={0.2}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data?.revenueData || []}>
              <defs>
                <linearGradient id="gradMRR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={2} fill="url(#gradMRR)" name="MRR" />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#gradRev)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Feature Usage" subtitle="Engagement by feature (% of users)" delay={0.3}>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={data?.featureUsage || []}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="feature" tick={{ fill: "#64748b", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Radar name="Usage" dataKey="usage" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cohorts & Traffic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Retention Cohorts" subtitle="User retention over time" className="lg:col-span-2" delay={0.4}>
          <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
            Retention data not available
          </div>
        </ChartCard>

        <ChartCard title="Traffic Sources" subtitle="User acquisition channels" delay={0.5}>
          <div className="space-y-4">
            {(data?.trafficSources || []).map((source: any, index: number) => (
              <div key={source.source + index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{source.source}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{source.users.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 w-8 text-right">{source.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Traffic</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {(data?.trafficSources || []).reduce((a: any, b: any) => a + b.users, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Hourly Activity & Asset Creation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Hourly Activity" subtitle="Users & actions by time of day" delay={0.6}>
          {data?.hourlyActivity ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Users" />
                <Bar dataKey="actions" fill="#10b981" radius={[4, 4, 0, 0]} name="Actions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
              Hourly activity data not available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Asset Creation" subtitle="Weekly breakdown by type" delay={0.7}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.weeklyActivity || []}>
              <defs>
                <linearGradient id="gradCards" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="cards" stroke="#3b82f6" fill="url(#gradCards)" strokeWidth={2} name="Business Cards" />
              <Area type="monotone" dataKey="invoices" stroke="#10b981" fill="url(#gradInv)" strokeWidth={2} name="Invoices" />
              <Area type="monotone" dataKey="logos" stroke="#8b5cf6" fill="transparent" strokeWidth={2} name="AI Logos" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Daily Stats Table */}
      <ChartCard title="Daily Breakdown" subtitle="Detailed metrics by day" delay={0.8}>
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-slate-100 dark:border-slate-800">
                <TableHead className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Date</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">New Users</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Active</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Cards</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Invoices</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Logos</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Credits</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium text-emerald-600 dark:text-slate-400">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.dailyStats || []).map((row: any, i: number) => (
                <TableRow key={row.date + i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <TableCell className="py-3 px-4 font-medium">{row.date}</TableCell>
                  <TableCell className="text-right py-3 px-4">{row.newUsers}</TableCell>
                  <TableCell className="text-right py-3 px-4">{row.active}</TableCell>
                  <TableCell className="text-right py-3 px-4">{row.cards}</TableCell>
                  <TableCell className="text-right py-3 px-4">{row.invoices}</TableCell>
                  <TableCell className="text-right py-3 px-4">{row.logos}</TableCell>
                  <TableCell className="text-right py-3 px-4">{row.credits}</TableCell>
                  <TableCell className="text-right py-3 px-4 font-medium text-emerald-600">${row.revenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>
    </div>
  );
}
