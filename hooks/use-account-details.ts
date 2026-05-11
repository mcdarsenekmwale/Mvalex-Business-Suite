// Hook to fetch and update user account details

import { useRequest } from "./use-request";
import { useSession } from "./use-session";

//use account details
export const useAccountDetails = () => {

    const {session} = useSession();
    const user = session?.user;

    const { data, isLoading, error, refetch } = useRequest(`/api/user/${user?.id}`, {
        method: "GET",
        refreshInterval: 30000, // 30 seconds instead of 5 seconds
        retryCount: 2,
        retryDelay: 1000,
      });

      return {
        data: data?.data || data,
        isLoading,
        error,
        refetch,
      };
}