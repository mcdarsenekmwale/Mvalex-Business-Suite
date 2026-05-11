"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "blue" | "green" | "amber" | "purple" | "rose" | "cyan" | "gray" | "emerald" | "indigo" | 'orange' | 'red'| 'slate'  ;
  delay?: number;
  valueClassName?: string;
}

const colorMap = {
  blue: "from-blue-500/10 to-blue-600/5 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30",
  green: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30",
  amber: "from-amber-500/10 to-amber-600/5 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30",
  purple: "from-purple-500/10 to-purple-600/5 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/30",
  rose: "from-rose-500/10 to-rose-600/5 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/30",
  cyan: "from-cyan-500/10 to-cyan-600/5 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-800/30",
  gray: "from-slate-500/10 to-slate-600/5 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30",
  emerald: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30",
  indigo: "from-indigo-500/10 to-indigo-600/5 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/30",
  orange: "from-orange-500/10 to-orange-600/5 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/30",
  red: "from-red-500/10 to-red-600/5 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/30",
  slate: "from-slate-500/10 to-slate-600/5 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30",
};

const iconBgMap = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  gray: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  indigo: "bg-indigo-500/10 text-indigo-400 dark:text-indigo-600",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = "blue",
  delay = 0,
  valueClassName = "",
}: StatsCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-slate-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-md border bg-gradient-to-br p-4 shadow-sm transition-shadow hover:shadow-md",
        colorMap[color]
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] bg-[length:20px_20px]" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className={cn("text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100", valueClassName)}>
            {value}
          </p>
          {(trend || description) && (
            <div className="flex items-center gap-2">
              {trend && (
                <span className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trendValue}
                </span>
              )}
              {description && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{description}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", iconBgMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
