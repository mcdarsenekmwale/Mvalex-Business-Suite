// Hook to fetch and update user credit balance
import { useRequest } from "./use-request";
import { useSession } from "./use-session"

export const useCreditBalance = () => {

    const {session} = useSession();
    const user = session?.user;

    // Fetch user credit balance
    const { data, isLoading, error, refetch } = useRequest(`/api/user/credits/balance`, {
        method: "GET",
        refreshInterval: 30000 * 15, // 15 minutes instead of 5 seconds
        retryCount: 2,
        retryDelay: 1000,
      });

      return {
        data: data?.balance || 0,
        user,
        cacheHit: data?.cacheHit || false,
        isLoading,
        error,
        refetch,
      };


}



