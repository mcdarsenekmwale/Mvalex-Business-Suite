"use client";

import React, { useState } from "react";

export default function ExportButton({ filters }: { filters: Record<string, any> }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: "csv" | "xlsx") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/(admin)/users/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button disabled={loading} onClick={() => handleExport("csv")} className="px-3 py-2 bg-white border rounded-md">Export CSV</button>
      <button disabled={loading} onClick={() => handleExport("xlsx")} className="px-3 py-2 bg-white border rounded-md">Export Excel</button>
    </div>
  );
}
