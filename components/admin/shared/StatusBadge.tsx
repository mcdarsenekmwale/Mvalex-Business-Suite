"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
  SUSPENDED: {
    label: "Suspended",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50",
    dot: "bg-rose-500",
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/50",
    dot: "bg-slate-400",
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  OPEN: {
    label: "Open",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50",
    dot: "bg-blue-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/50",
    dot: "bg-purple-500",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/50",
    dot: "bg-slate-400",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50",
    dot: "bg-rose-500",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/50",
    dot: "bg-orange-500",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/50",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/50",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1 py-0.5 font-medium",
        size === "sm" ? "text-[9px]" : "text-xs",
        config.className
      )}
    >
      <span className={cn("rounded-full", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2", config.dot)} />
      {config.label}
    </span>
  );
}
