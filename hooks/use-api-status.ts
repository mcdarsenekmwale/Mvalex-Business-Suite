// hooks/use-api-status.ts
import { useRequest } from "@/hooks/use-request";

// Custom hook to fetch API status
export const useApiStatus = () => {
  const { data, isLoading, error, refetch } = useRequest("/api/health/status", {
    method: "GET",
    refreshInterval: 30000, // 30 seconds instead of 5 seconds
    retryCount: 2,
    retryDelay: 1000,
  });

  return {
    data,
    status: data?.status,
    isHealthy: data?.status === "healthy",
    timestamp: data?.timestamp,
    uptime: data?.uptime,
    services: data?.services,
    version: data?.version,
    environment: data?.environment,
    lastBackupTime: data?.lastBackupTime,
    apiResponseTime: data?.apiResponseTime,
    activeUsers: data?.activeUsers,
    isLoading,
    error,
    refetch,
  };
};