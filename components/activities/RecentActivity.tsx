"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  FileText,
  Palette,
  Download,
  User,
  Clock,
  TrendingUp,
  Zap,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const activityIcons: Record<string, React.ElementType> = {
  CREATE_BUSINESS_CARD: FileText,
  EDIT_BUSINESS_CARD: FileText,
  DELETE_BUSINESS_CARD: FileText,
  CREATE_INVOICE: FileText,
  EDIT_INVOICE: FileText,
  DELETE_INVOICE: FileText,
  GENERATE_LOGO: Palette,
  GENERATE_LOGO_COMPLETED: Palette,
  EXPORT_FILE: Download,
  DELETE_EXPORT: Download,
  AI_ASSISTANT_MESSAGE: Zap,
  LOGIN: User,
  LOGOUT: User,
  UPDATE_PROFILE: User,
  ADD_CREDITS: TrendingUp,
  USE_CREDITS: CreditCard,
  CREDIT_PURCHASE: TrendingUp,
  REFUND: AlertCircle,
};

const actionColors: Record<string, string> = {
  CREATE_BUSINESS_CARD: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  EDIT_BUSINESS_CARD: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
  DELETE_BUSINESS_CARD: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  CREATE_INVOICE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  EDIT_INVOICE: "bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400",
  DELETE_INVOICE: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  GENERATE_LOGO: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  GENERATE_LOGO_COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  EXPORT_FILE: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  DELETE_EXPORT: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  AI_ASSISTANT_MESSAGE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  LOGIN: "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
  LOGOUT: "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
  CREDIT_PURCHASE: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  REFUND: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
};

interface ActivityItem {
  id: string;
  action: string;
  actionType: string;
  entityType: string;
  description: string;
  creditsUsed: number;
  createdAt: string;
}

interface RecentActivityProps {
  limit?: number;
  showHeader?: boolean;
}

export function RecentActivity({ limit = 5, showHeader = true }: RecentActivityProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-activities", limit],
    queryFn: async () => {
      const res = await fetch(`/api/user/activities?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const activities: ActivityItem[] = data?.activities || [];

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.action] || Activity;
            const colorClass = actionColors[activity.action] || "bg-muted text-muted-foreground";

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.description || activity.action}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {activity.creditsUsed > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        -{activity.creditsUsed}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No recent activity to show
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
