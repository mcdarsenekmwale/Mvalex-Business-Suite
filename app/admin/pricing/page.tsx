// app/(admin)/pricing/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Save,
  Zap,
  CreditCard,
  FileText,
  Palette,
  Bot,
  Crown,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { ChartCard } from "@/components/admin/shared/ChartCard";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface PricingRule {
  id: string;
  action: string;
  cost: number;
  description: string | null;
  isActive: boolean;
  revenue?: number;
  usageCount?: number;
}

interface PricingStats {
  totalActions: number;
  activeRules: number;
  averageCost: number;
  totalRevenue: number;
  totalCreditsUsed: number;
  mostUsedAction: string;
  highestRevenueAction: string;
}

interface UsageData {
  action: string;
  uses: number;
  revenue: number;
  label: string;
  icon: string;
  color: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  creditsUsed: number;
}

interface ActionDistribution {
  name: string;
  value: number;
  color: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  CREATE_BUSINESS_CARD: { label: "Create Business Card", icon: CreditCard, color: "text-blue-500" },
  EDIT_BUSINESS_CARD: { label: "Edit Business Card", icon: CreditCard, color: "text-blue-400" },
  CREATE_INVOICE: { label: "Create Invoice", icon: FileText, color: "text-emerald-500" },
  EDIT_INVOICE: { label: "Edit Invoice", icon: FileText, color: "text-emerald-400" },
  GENERATE_LOGO: { label: "Generate Logo", icon: Palette, color: "text-purple-500" },
  GENERATE_LOGO_VARIATIONS: { label: "Logo Variations", icon: Palette, color: "text-purple-400" },
  EXPORT_BUSINESS_CARD_PNG: { label: "Export Card (PNG)", icon: Zap, color: "text-amber-500" },
  EXPORT_BUSINESS_CARD_PDF: { label: "Export Card (PDF)", icon: Zap, color: "text-amber-500" },
  EXPORT_INVOICE_PDF: { label: "Export Invoice (PDF)", icon: Zap, color: "text-amber-500" },
  EXPORT_INVOICE_EXCEL: { label: "Export Invoice (Excel)", icon: Zap, color: "text-amber-500" },
  EXPORT_LOGO_PNG: { label: "Export Logo (PNG)", icon: Zap, color: "text-amber-500" },
  EXPORT_LOGO_SVG: { label: "Export Logo (SVG)", icon: Zap, color: "text-amber-500" },
  AI_CHAT_MESSAGE: { label: "AI Chat Message", icon: Bot, color: "text-cyan-500" },
  AI_DESIGN_SUGGESTION: { label: "AI Design Suggestion", icon: Bot, color: "text-cyan-400" },
  PREMIUM_TEMPLATE: { label: "Premium Template", icon: Crown, color: "text-rose-500" },
};

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export default function PricingManagementPage() {
  const queryClient = useQueryClient();
  const [editedRules, setEditedRules] = useState<Record<string, Partial<PricingRule>>>({});
  const [activeTab, setActiveTab] = useState("rules");
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">("month");

  // Fetch pricing rules
  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ["admin-pricing", "rules"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pricing/rules");
      if (!res.ok) throw new Error("Failed to fetch pricing rules");
      return res.json();
    },
  });

  // Fetch pricing statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-pricing", "stats", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/pricing/stats?dateRange=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch pricing stats");
      return res.json();
    },
  });

  // Fetch usage analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-pricing", "analytics", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/pricing/analytics?dateRange=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Update pricing mutation
  const updateMutation = useMutation({
    mutationFn: async (rules: PricingRule[]) => {
      const res = await fetch("/api/admin/pricing/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) throw new Error("Failed to update pricing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
      setEditedRules({});
      toast.success("Pricing rules updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update pricing rules");
    },
  });

  // Reset to default mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/pricing/reset", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset pricing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
      toast.success("Pricing rules reset to defaults!");
    },
    onError: () => {
      toast.error("Failed to reset pricing rules. Please try again.");
    },
  });

  const rules: PricingRule[] = rulesData?.rules || [];
  const stats: PricingStats = statsData?.stats || {
    totalActions: 0,
    activeRules: 0,
    averageCost: 0,
    totalRevenue: 0,
    totalCreditsUsed: 0,
    mostUsedAction: "N/A",
    highestRevenueAction: "N/A",
  };
  
  const usageData: UsageData[] = analyticsData?.usageByAction || [];
  const revenueData: RevenueData[] = analyticsData?.revenueByMonth || [];
  const actionDistribution: ActionDistribution[] = analyticsData?.actionDistribution || [];

  const updateRule = (action: string, updates: Partial<PricingRule>) => {
    setEditedRules((prev) => ({ ...prev, [action]: { ...prev[action], ...updates } }));
  };

  const getRuleValue = <K extends keyof PricingRule>(rule: PricingRule, key: K): PricingRule[K] => {
    const edited = editedRules[rule.action];
    if (edited && key in edited) return edited[key] as PricingRule[K];
    return rule[key];
  };

  const hasChanges = Object.keys(editedRules).length > 0;

  const handleSave = () => {
    const updatedRules = rules.map((rule) => {
      const edits = editedRules[rule.action];
      if (!edits) return rule;
      return { ...rule, ...edits };
    });
    updateMutation.mutate(updatedRules);
  };

  const isLoading = rulesLoading || statsLoading || analyticsLoading;

  if (isLoading && rules.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pricing Rules" subtitle="Configure credit costs for platform actions" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Rules"
        subtitle="Configure credit costs for platform actions"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRules()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="gap-1.5 bg-primary text-white"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      />

      {/* Stats Cards - Real Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Actions"
          value={stats.totalActions || 0}
          icon={Zap}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Active Rules"
          value={stats.activeRules || 0}
          icon={CheckCircle2}
          color="green"
          delay={0.1}
          trend={stats.activeRules > 0 ? "up" : "down"}
          trendValue={`${Math.round((stats.activeRules / stats.totalActions) * 100)}%`}
        />
        <StatsCard
          title="Avg Cost"
          value={`${stats.averageCost || 0 } cr`}
          icon={Coins}
          color="amber"
          delay={0.2}
        />
        <StatsCard
          title="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString()} cr`}
          icon={TrendingUp}
          color="purple"
          delay={0.3}
          trend="up"
          trendValue="+12.5%"
        />
      </div>

      {/* Date Range Selector */}
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button
            variant={dateRange === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("week")}
          >
            Last 7 Days
          </Button>
          <Button
            variant={dateRange === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("month")}
          >
            Last 30 Days
          </Button>
          <Button
            variant={dateRange === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("year")}
          >
            Last Year
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="rules">Pricing Rules</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Pricing Rules Tab */}
        <TabsContent value="rules">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
          >
            <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Credit Cost Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">Set credit costs per platform action</p>
            </div>
            <div className="p-6">
              {rules.length === 0 ? (
                <div className="text-center py-12">
                  <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pricing rules configured</h3>
                  <p className="text-muted-foreground">
                    Click "Reset to Defaults" to create default pricing rules.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, index) => {
                    const config = ACTION_CONFIG[rule.action] || { 
                      label: rule.action.replace(/_/g, " "), 
                      icon: Zap, 
                      color: "text-slate-500" 
                    };
                    const Icon = config.icon;
                    const isActive = getRuleValue(rule, "isActive");
                    const cost = getRuleValue(rule, "cost");
                    
                    return (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.002 }}
                        className="flex items-center gap-4 p-4 rounded-md border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 transition-all hover:shadow-sm"
                      >
                        <div className={`p-2.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {config.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isActive 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" 
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                            {rule.usageCount && rule.usageCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Used {rule.usageCount} times
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                          )}
                          {rule.revenue && rule.revenue > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              Revenue: {rule.revenue.toLocaleString()} credits
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap text-slate-500">Cost</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={cost}
                                onChange={(e) => updateRule(rule.action, { cost: parseInt(e.target.value) || 0 })}
                                className="w-20 text-center pr-6"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                cr
                              </span>
                            </div>
                          </div>
                          <Switch
                            checked={!!isActive}
                            onCheckedChange={(checked) => updateRule(rule.action, { isActive: checked })}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Usage Analytics Tab */}
        <TabsContent value="usage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Usage by Action" subtitle="Number of times each action was used" delay={0.2}>
              {usageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={usageData} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={120} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      formatter={(value: number) => [`${value.toLocaleString()} uses`, "Usage"]}
                    />
                    <Bar dataKey="uses" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Uses" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No usage data available for selected period
                </div>
              )}
            </ChartCard>

            <ChartCard title="Action Distribution" subtitle="Percentage breakdown by action" delay={0.3}>
              {actionDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={actionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {actionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} uses`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No distribution data available
                </div>
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <div className="grid grid-cols-1 gap-6">
            <ChartCard title="Revenue & Credits Used" subtitle="Monthly trend" delay={0.2}>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      formatter={(value: number) => [`${value.toLocaleString()}`, ""]}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8b5cf6" 
                      strokeWidth={2} 
                      dot={{ fill: "#8b5cf6", r: 4 }}
                      name="Revenue (credits)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="creditsUsed" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={{ fill: "#3b82f6", r: 4 }}
                      name="Credits Used"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No revenue data available for selected period
                </div>
              )}
            </ChartCard>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Most Used Action</h4>
                <p className="text-2xl font-bold">{stats.mostUsedAction || "N/A"}</p>
              </div>
              <div className="rounded-lg border p-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Highest Revenue Action</h4>
                <p className="text-2xl font-bold">{stats.highestRevenueAction || "N/A"}</p>
              </div>
              <div className="rounded-lg border p-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Credits Used</h4>
                <p className="text-2xl font-bold">{stats.totalCreditsUsed.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Average Daily Usage</h4>
                <p className="text-2xl font-bold">
                  {Math.round(stats.totalCreditsUsed / (dateRange === "week" ? 7 : dateRange === "month" ? 30 : 365))}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}