"use client";

import { useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Tracks session activity by calling the activity API.
 * Reports on mount and every 5 minutes while authenticated.
 */
export function useSessionTracker() {
  const { status } = useSession();

  const reportActivity = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      await fetch("/api/session/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // ignore tracking errors
    }
  }, [status]);

  // Report on mount / when auth status changes to authenticated
  useEffect(() => {
    if (status === "authenticated") {
      reportActivity();
    }
  }, [status, reportActivity]);

  // Periodic heartbeat every 5 minutes
  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(reportActivity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [status, reportActivity]);
}
