// hooks/useSession.ts (Custom hook for typed session)
import { useSession as useNextAuthSession } from "next-auth/react";

interface CustomUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
  creditsBalance: number;
  status?: "ACTIVE" | "SUSPENDED" | "PENDING";
}

interface CustomSession {
  user: CustomUser;
  expires: string;
}

export function useSession() {
  const { data: session, status, update } = useNextAuthSession();
  
  return {
    session: session as CustomSession | null,
    status,
    update,
  };
}