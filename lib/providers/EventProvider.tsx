// components/providers/EventProvider.tsx
"use client";

import { useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getGlobalEventReader, EventType } from "@/lib/events/global-event-reader";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EventProviderProps {
  children: ReactNode;
}

export function EventProvider({ children }: EventProviderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const eventReader = getGlobalEventReader();
      
      // Generate auth token from session
      const token = session?.user?.id; // In production, use actual JWT token
      eventReader.connect(session.user.id, token);
      
      // Listen for credit low events
      const unsubscribeCredit = eventReader.on(EventType.CREDIT_LOW, (payload) => {
        toast.error("Low Credits", {
          description: payload.data.message || "Your credits are running low. Purchase more to continue.",
          duration: 10000,
          action: {
            label: "Purchase",
            onClick: () => router.push("/credits/purchase"),
          },
        });
      });
      
      // Listen for export completed events
      const unsubscribeExport = eventReader.on(EventType.EXPORT_COMPLETED, (payload) => {
        toast.success("Export Ready", {
          description: payload.data.message || "Your file is ready for download.",
          action: {
            label: "Download",
            onClick: () => {
              if (payload.data.downloadUrl) {
                window.open(payload.data.downloadUrl, "_blank");
              }
            },
          },
        });
      });
      
      // Listen for system maintenance events
      const unsubscribeMaintenance = eventReader.on(EventType.SYSTEM_MAINTENANCE, (payload) => {
        toast.warning("System Maintenance", {
          description: payload.data.message || "The system will undergo maintenance soon.",
          duration: 30000,
        });
      });
      
      return () => {
        unsubscribeCredit();
        unsubscribeExport();
        unsubscribeMaintenance();
        eventReader.disconnect();
      };
    }
  }, [session, status, router]);

  return <>{children}</>;
}