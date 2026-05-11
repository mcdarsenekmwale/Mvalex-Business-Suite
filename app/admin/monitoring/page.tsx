"use client";

import {
  Activity,
  Server,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  HardDrive,
  MemoryStick,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { ChartCard } from "@/components/admin/shared/ChartCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GraphSkeleton } from "@/components/shared/ui/loading-shimmer";
import { Button } from "@/components/ui/button";

interface ServiceStatus {
  name: string;
  status: "healthy" | "warning" | "critical";
  uptime: string;
  latency: string;
}

interface AlertItem {
  type: "warning" | "success" | "error" | "info";
  title: string;
  desc: string;
  time: string;
}

export default function MonitoringPage() {

  // Fetch system health data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: async () => {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error("Failed to fetch health data");
      return res.json();
    },
  });

  const services: ServiceStatus[] = data?.services || [];
  const cpuData = data?.cpuData || [];
  const memoryData = data?.memoryData || [];
  const alerts: AlertItem[] = data?.alerts || [];

  if (isLoading) 
    return <GraphSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring" 
        subtitle="System health and performance metrics"
        action={
        <Button
          variant="outline"
          className="bg-slate-100 dark:bg-slate-500"
         onClick={() => refetch()}>Refresh</Button>}
       />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Services Healthy" value={isLoading ? "—" : data?.stats?.healthy ?? "—"} icon={CheckCircle2} color="green" delay={0} />
        <StatsCard title="Warnings" value={isLoading ? "—" : data?.stats?.warnings ?? "—"} icon={AlertCircle} color="amber" delay={0.1} />
        <StatsCard title="Avg Response" value={isLoading ? "—" : data?.stats?.avgResponse ?? "—"} icon={Clock} color="blue" delay={0.2} />
        <StatsCard title="Uptime (30d)" value={isLoading ? "—" : data?.stats?.uptime ?? "—"} icon={Activity} color="purple" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
        >
          <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <h3 className="font-semibold flex items-center gap-2"><Server className="h-4 w-4" /> Service Health</h3>
          </div>
          <div className="p-6 space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading services...</div>
            ) : (
              services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      service.status === "healthy" ? "bg-emerald-500" :
                      service.status === "warning" ? "bg-amber-500" : "bg-rose-500"
                    }`} />
                    <span className="font-medium text-sm">{service.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      service.status === "healthy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      service.status === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                      "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                    }`}>
                      {service.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-slate-500">Uptime: <span className="font-medium text-slate-900 dark:text-slate-100">{service.uptime}</span></span>
                    <span className="text-slate-500">Latency: <span className="font-medium text-slate-900 dark:text-slate-100">{service.latency}</span></span>
                  </div>
                </div>
              ))
            )}
            {!isLoading && services.length === 0 && (
              <div className="text-sm text-slate-500">No services found.</div>
            )}
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
        >
          <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <h3 className="font-semibold">Recent Alerts</h3>
          </div>
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading alerts...</div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className={`p-3 rounded-lg flex items-start gap-3 ${
                  alert.type === "warning" ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30" :
                  alert.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30" :
                  alert.type === "error" ? "bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/30" :
                  "bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30"
                }`}>
                  {alert.type === "warning" ? <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" /> :
                   alert.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> :
                   alert.type === "error" ? <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5" /> :
                   <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />}
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-slate-500">{alert.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))
            )}
            {!isLoading && alerts.length === 0 && (
              <div className="text-sm text-slate-500">No alerts found.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Resource Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="CPU Usage" subtitle="Percentage over time" delay={0.4}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cpuData}>
              <defs>
                <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="usage" stroke="#3b82f6" fill="url(#gradCpu)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Memory Usage" subtitle="GB used over time" delay={0.5}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={memoryData}>
              <defs>
                <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}GB`} />
              <Tooltip formatter={(v: number) => `${v} GB`} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="used" stroke="#8b5cf6" fill="url(#gradMem)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Resource Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm p-6"
      >
        <h3 className="font-semibold mb-4">Resource Allocation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU</span><span className="font-medium">{isLoading ? "—" : `${data?.resources?.cpu ?? 0}%`}</span></div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: isLoading ? "0%" : `${data?.resources?.cpu ?? 0}%` }} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-2"><MemoryStick className="h-4 w-4" /> Memory</span><span className="font-medium">{isLoading ? "—" : `${data?.resources?.memory ?? 0}%`}</span></div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: isLoading ? "0%" : `${data?.resources?.memory ?? 0}%` }} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-600 dark:text-slate-400 flex items-center gap-2"><HardDrive className="h-4 w-4" /> Disk</span><span className="font-medium">{isLoading ? "—" : `${data?.resources?.disk ?? 0}%`}</span></div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: isLoading ? "0%" : `${data?.resources?.disk ?? 0}%` }} /></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
