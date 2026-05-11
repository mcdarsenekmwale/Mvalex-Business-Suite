"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

export default function UserStatsCards() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const stats = data?.stats || {};

  const items = [
    { label: "Total Users", value: stats.totalUsers ?? 0 },
    { label: "Active", value: stats.activeUsers ?? 0 },
    { label: "Suspended", value: stats.suspendedUsers ?? 0 },
    { label: "New This Month", value: stats.newUsersThisMonth ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((s) => (
        <div key={s.label} className="p-4 bg-white rounded shadow text-center">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-xl font-semibold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
