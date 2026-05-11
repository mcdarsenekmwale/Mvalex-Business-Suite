// components/general/layout/UserStateMenu.tsx
// Dropdown menu for user agent state actions

"use client";

import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Circle, CircleX, Loader2, ChevronRight, UserCircle, Headset, Clock7, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type AgentStatus =    "ONLINE"
  | "BUSY"
  | "AWAY"
  | "OFFLINE"
  | "IN_MEETING"
  | "ON_BREAK"
  | "TRAINING";

const statusConfig: Record<AgentStatus, { label: string; icon: React.ReactNode; color: string }> = {
  ONLINE: {
    label: "Online",
    icon: <Circle className="h-3 w-3 fill-current" />,
    color: "text-green-500",
  },
  BUSY: {
    label: "Busy",
    icon: <Circle className="h-3 w-3 fill-current" />,
    color: "text-red-500",
  },
  AWAY: {
    label: "Away",
    icon: <Circle className="h-3 w-3 fill-current" />,
    color: "text-yellow-500",
  },
  IN_MEETING: {
    label: "In Meeting",
    icon: <Headset className="h-3 w-3 fill-current" />,
    color: "text-blue-500",
  },
  ON_BREAK: {
    label: "On Break",
    icon: <Clock7 className="h-3 w-3 fill-current" />,
    color: "text-purple-500",
  },
  TRAINING: {
    label: "Training",
    icon: <GraduationCap className="h-3 w-3 fill-current" />,
    color: "text-orange-500",
  },
  OFFLINE: {
    label: "Offline",
    icon: <CircleX className="h-3 w-3" />,
    color: "text-gray-500",
  },
};

interface UserStateMenuProps {
  asSubmenu?: boolean;
  triggerClassName?: string;
  onStatusChange?: (status: AgentStatus) => void;
}

export function UserStateMenu({ asSubmenu = false, triggerClassName, onStatusChange }: UserStateMenuProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState<AgentStatus | null>(null);

  // Fetch current agent status
  const { data: currentStatus, isLoading } = useQuery({
    queryKey: ["agent-status"],
    queryFn: async () => {
      const res = await fetch("/api/agents/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      return data.status as AgentStatus;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: AgentStatus) => {
      setIsUpdating(status);
      const res = await fetch("/api/agents/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["agent-status"] });
      toast.success(`Agent status updated to ${statusConfig[status].label}`);
      onStatusChange?.(status);
    },
    onError: (error: Error) => {
      toast.error("Failed to update status", {
        description: error.message,
      });
    },
    onSettled: () => {
      setIsUpdating(null);
    },
  });

  const handleStatusChange = (status: AgentStatus) => {
    updateStatusMutation.mutate(status);
  };

  const currentStatusLabel = currentStatus ? statusConfig[currentStatus] : null;
  const displayStatus = currentStatusLabel?.label || "Offline";
  const displayColor = currentStatusLabel?.color || "text-gray-500";

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-2 py-1.5", triggerClassName)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading status...</span>
      </div>
    );
  }


  // Render as submenu (nested inside user menu)
  if (asSubmenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <UserCircle className="h-4 w-4" />
          <span>Agent Status</span>
          {currentStatus && (
            <span className={cn("ml-auto text-xs", displayColor)}>
              {displayStatus}
            </span>
          )}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-48" sideOffset={8}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Set your agent presence
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(statusConfig).map(([status, config]) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status as AgentStatus)}
                disabled={updateStatusMutation.isPending && isUpdating === status}
                className="gap-2 cursor-pointer"
              >
                {isUpdating === status ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className={cn("h-4 w-4", config.color)}>{config.icon}</span>
                )}
                <span className={cn("text-xs")}>{config.label}</span>
                {currentStatus === status && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  // Render as standalone dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("gap-2", triggerClassName)}
        >
          <div className={cn("h-2 w-2 rounded-full", {
            "bg-green-500": currentStatus === "ONLINE",
            "bg-red-500": currentStatus === "BUSY",
            "bg-yellow-500": currentStatus === "AWAY",
            "bg-gray-500": currentStatus === "OFFLINE",
          })} />
          <span className="text-sm">Agent: {displayStatus}</span>
          <ChevronRight className="h-3 w-3 rotate-90" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Agent Presence</p>
            <p className="text-xs leading-none text-muted-foreground">
              Current: <span className={displayColor}>{displayStatus}</span>
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(statusConfig).map(([status, config]) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status as AgentStatus)}
            disabled={updateStatusMutation.isPending && isUpdating === status}
            className="gap-2 cursor-pointer"
          >
            {isUpdating === status ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className={cn("h-4 w-4", config.color)}>{config.icon}</span>
            )}
            <span>{config.label}</span>
            {currentStatus === status && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserStateMenu;