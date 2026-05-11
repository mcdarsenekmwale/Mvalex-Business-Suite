// hooks/use-session-with-mfa.ts
"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";

interface SessionWithMFA {
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    roleSubtype: string;
    creditsBalance: number;
    status: string;
    mfaEnabled: boolean;
    mfaRequired: boolean;
    mfaVerified: boolean;
    mfaVerifiedAt?: number;
    permissions: string[];
  };
  expires: string;
}

export function useSessionWithMFA() {
  const { data: session, update, status } = useSession();
  const sessionData = session as SessionWithMFA | null;
  
  const updateMFAVerification = useCallback(async (verified: boolean) => {
    const result = await update({ mfaVerified: verified, mfaVerifiedAt: verified ? Date.now() : undefined });
    return result;
  }, [update]);
  
  const updateMFASetupComplete = useCallback(async () => {
    const result = await update({ mfaSetupComplete: true });
    return result;
  }, [update]);
  
  const isMFARequired = sessionData?.user?.mfaRequired && !sessionData?.user?.mfaVerified;
  const isMFAEnabled = sessionData?.user?.mfaEnabled || false;
  
  return {
    session: sessionData,
    status,
    update,
    updateMFAVerification,
    updateMFASetupComplete,
    isMFARequired,
    isMFAEnabled,
    userId: sessionData?.user?.id,
    userRole: sessionData?.user?.role,
    userPermissions: sessionData?.user?.permissions || [],
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}