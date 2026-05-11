"use client";

import { signOut } from "next-auth/react";

/**
 * Sign out while logging the logout activity server-side.
 * Fires the logout activity log asynchronously then proceeds with NextAuth signOut.
 */
export async function signOutWithLog(callbackUrl = "/") {
  // Fire logout activity log (best-effort, non-blocking)
  fetch("/api/auth/logout-activity", { method: "POST" }).catch(() => {
    // Ignore errors — don't block sign out
  });

  // Slight delay to give the fetch a chance to dispatch before page unloads
  await new Promise((resolve) => setTimeout(resolve, 80));

  signOut({ callbackUrl });
}
