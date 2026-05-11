"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Monitor,
  Smartphone,
  Tablet,
  Bot,
  HelpCircle,
  LogOut,
  Trash2,
  Shield,
  Clock,
  MapPin,
  Globe,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SessionItem {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActivityAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  status: string;
}

const deviceIcons: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-5 w-5" />,
  mobile: <Smartphone className="h-5 w-5" />,
  tablet: <Tablet className="h-5 w-5" />,
  bot: <Bot className="h-5 w-5" />,
  unknown: <HelpCircle className="h-5 w-5" />,
};

export default function UserSessionsPage() {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/user/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke session");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Session revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke session");
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke sessions");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Other sessions revoked");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke sessions");
    },
  });

  const sessions: SessionItem[] = data?.sessions || [];

  const handleRevoke = (sessionId: string) => {
    setRevokingId(sessionId);
    revokeMutation.mutate(sessionId, {
      onSettled: () => setRevokingId(null),
    });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Active Sessions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your active sessions across all devices
        </p>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Sessions</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading sessions..."
                : `${sessions.length} active session${sessions.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {revokeAllMutation.isPending ? "Revoking..." : "Revoke All Other"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active sessions found</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  session.isCurrent
                    ? "bg-primary/5 border-primary/20"
                    : "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-700">
                  {deviceIcons[session.deviceType] || deviceIcons.unknown}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {session.browser} on {session.os}
                    </p>
                    {session.isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.ipAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last active: {formatDate(session.lastActivityAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Expires: {formatDate(session.expiresAt)}
                    </span>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokeMutation.isPending && revokingId === session.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Security Tip</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
              If you notice any unfamiliar sessions, revoke them immediately and change your password.
              Your current session will remain active.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
