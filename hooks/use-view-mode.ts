// lib/hooks/use-view-mode.ts
import { useState } from "react";
import type { ViewMode } from "@/lib/types";

export function useViewMode(initialViewMode: ViewMode = "user") {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  return {
    viewMode,
    setViewMode,
  };
}