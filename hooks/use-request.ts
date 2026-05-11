// lib/hooks/use-request.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface RequestOptions extends RequestInit {
  refreshInterval?: number;
  skip?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface RequestState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  status: "idle" | "loading" | "success" | "error";
}

export function useRequest<T = any>(
  url: string,
  options: RequestOptions = {}
): RequestState<T> & {
  refetch: () => Promise<void>;
  mutate: (newData: T | ((prevData: T | null) => T)) => void;
} {
  const {
    refreshInterval,
    skip = false,
    onSuccess,
    onError,
    retryCount = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  const { data: session } = useSession();
  const [state, setState] = useState<RequestState<T>>({
    data: null,
    isLoading: false,
    error: null,
    status: "idle",
  });
  
  const retryAttemptsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const isMountedRef = useRef(true);
  const urlRef = useRef(url);
  const fetchOptionsRef = useRef(fetchOptions);
  const sessionRef = useRef(session);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const retryCountRef = useRef(retryCount);
  const retryDelayRef = useRef(retryDelay);
  const skipRef = useRef(skip);
  const refreshIntervalRef = useRef(refreshInterval);

  // Update refs when dependencies change
  useEffect(() => {
    urlRef.current = url;
    fetchOptionsRef.current = fetchOptions;
    sessionRef.current = session;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    retryCountRef.current = retryCount;
    retryDelayRef.current = retryDelay;
    skipRef.current = skip;
    refreshIntervalRef.current = refreshInterval;
  });

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchData = useCallback(async (): Promise<void> => {
    if (skipRef.current) return;

    // Only proceed if component is mounted
    if (!isMountedRef.current) return;

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, status: "loading", error: null }));

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...fetchOptionsRef.current.headers,
      };

      // Add authorization header if session exists
      if (sessionRef.current?.user?.id) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${sessionRef.current.user.id}`;
      }

      const response = await fetch(urlRef.current, {
        ...fetchOptionsRef.current,
        headers,
        signal: abortControllerRef.current.signal,
      });

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setState({
        data,
        isLoading: false,
        error: null,
        status: "success",
      });
      
      retryAttemptsRef.current = 0;
      onSuccessRef.current?.(data);
    } catch (error) {
      // Check if component is still mounted
      if (!isMountedRef.current) return;

      if (error instanceof Error && error.name === "AbortError") {
        return; // Don't update state for aborted requests
      }

      const errorObj = error instanceof Error ? error : new Error("Unknown error");
      
      // Retry logic
      if (retryAttemptsRef.current < retryCountRef.current) {
        retryAttemptsRef.current++;
        setTimeout(() => {
          fetchData();
        }, retryDelayRef.current * retryAttemptsRef.current);
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorObj,
        status: "error",
      }));
      
      onErrorRef.current?.(errorObj);
    }
  }, []); // Empty dependency array - use refs for all dependencies

  // Auto-refresh logic - separated to avoid re-triggering
  useEffect(() => {
    if (refreshIntervalRef.current && !skipRef.current) {
      // Initial fetch
      fetchData();
      
      // Set up interval
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshIntervalRef.current);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchData]); // Only depend on fetchData which is stable

  // Manual refetch
  const refetch = useCallback(async () => {
    retryAttemptsRef.current = 0;
    await fetchData();
  }, [fetchData]);

  // Mutate data locally (optimistic updates)
  const mutate = useCallback((newData: T | ((prevData: T | null) => T)) => {
    setState(prev => ({
      ...prev,
      data: typeof newData === "function" ? (newData as (prevData: T | null) => T)(prev.data) : newData,
    }));
  }, []);

  return {
    ...state,
    refetch,
    mutate,
  };
}

// Specialized hooks
export function useApiStatus() {
  return useRequest<{
    status: string;
    timestamp: string;
    uptime: number;
    services: {
      database: { status: string; latency?: number };
      redis?: { status: string; latency?: number };
      storage?: { status: string; latency?: number };
    };
    version: string;
    environment: string;
    lastBackupTime?: string;
    apiResponseTime?: number;
    activeUsers?: number;
  }>("/api/health", {
    method: "GET",
    refreshInterval: 30000, // 30 seconds
    retryCount: 2,
  });
}

// Hook for dashboard stats
export function useDashboardStats() {
  return useRequest<{
    stats: {
      totalUsers: number;
      activeUsers: number;
      suspendedUsers: number;
      totalBusinessCards: number;
      totalInvoices: number;
      totalLogos: number;
      totalExports: number;
      totalCreditsUsed: number;
      openTickets: number;
      inProgressTickets: number;
      newUsersThisMonth: number;
      newCardsThisMonth: number;
      newInvoicesThisMonth: number;
      newLogosThisMonth: number;
    };
    userGrowth: Array<{ name: string; users: number; active: number }>;
    weeklyActivity: Array<{ name: string; cards: number; invoices: number; logos: number }>;
    roleDistribution: Array<{ name: string; value: number; color: string }>;
  }>("/api/admin/dashboard/stats", {
    method: "GET",
    refreshInterval: 60000, // 1 minute
  });
}

// Hook for recent users
export function useRecentUsers(limit: number = 5) {
  return useRequest<{
    users: Array<{
      id: string;
      name: string | null;
      email: string;
      status: string;
      creditsBalance: number;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/admin/users?limit=${limit}&sortBy=createdAt&sortOrder=desc`, {
    method: "GET",
    refreshInterval: 120000, // 2 minutes
  });
}

// Hook for recent tickets
export function useRecentTickets(limit: number = 5) {
  return useRequest<{
    tickets: Array<{
      id: string;
      subject: string;
      user: { name: string | null; email: string };
      status: string;
      priority: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/admin/tickets?limit=${limit}&sortBy=createdAt&sortOrder=desc`, {
    method: "GET",
    refreshInterval: 60000, // 1 minute
  });
}

// Hook for user credits
export function useUserCredits() {
  return useRequest<{
    balance: number;
    transactions: Array<{
      id: string;
      amount: number;
      type: string;
      action: string;
      description: string | null;
      balanceAfter: number;
      createdAt: string;
    }>;
    pricing: Array<{
      action: string;
      cost: number;
      description: string;
    }>;
  }>("/api/credits", {
    method: "GET",
    refreshInterval: 30000,
  });
}

// Hook for notifications
export function useNotifications() {
  return useRequest<{
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      isRead: boolean;
      createdAt: string;
    }>;
    unreadCount: number;
  }>("/api/notifications", {
    method: "GET",
    refreshInterval: 15000, // 15 seconds
  });
}

// Hook for business cards
export function useBusinessCards(page: number = 1, limit: number = 10) {
  return useRequest<{
    cards: Array<{
      id: string;
      template: string;
      data: any;
      frontPreview: string | null;
      backPreview: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/business-cards?page=${page}&limit=${limit}`, {
    method: "GET",
  });
}

// Hook for invoices
export function useInvoices(page: number = 1, limit: number = 10) {
  return useRequest<{
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      clientName: string;
      total: number;
      currency: string;
      status: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/invoices?page=${page}&limit=${limit}`, {
    method: "GET",
  });
}

// Hook for logos
export function useLogos(page: number = 1, limit: number = 10) {
  return useRequest<{
    logos: Array<{
      id: string;
      businessName: string;
      style: string;
      variations: any;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/logos?page=${page}&limit=${limit}`, {
    method: "GET",
  });
}

// Hook for support tickets
export function useSupportTickets(page: number = 1, limit: number = 10) {
  return useRequest<{
    tickets: Array<{
      id: string;
      subject: string;
      message: string;
      status: string;
      priority: string;
      createdAt: string;
      updatedAt: string;
      user?: { name: string | null; email: string };
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/support/tickets?page=${page}&limit=${limit}`, {
    method: "GET",
  });
}