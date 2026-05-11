"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Lock,
  Key,
  Fingerprint,
  AlertTriangle,
  Users,
  Eye,
  Ban,
  Globe,
  CircleCheckBig,
  LoaderCircle,
  RefreshCw,
  LoaderPinwheel,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
  Clock,
  MapPin,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LoadingShimmer } from "@/components/shared/ui/loading-shimmer";

export default function SecurityPage() {
  
  // Fetch security data from API
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-security"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security");
      if (!res.ok) throw new Error("Failed to fetch security data");
      return res.json();
    },
  });

  //Fetch MFA security data from API
  const { data: MFAData, isLoading: mfaLoading , isRefetching: mfaIsRefetching, refetch: mfaRefetch } = useQuery({
    queryKey: ["admin-mfa"],
    queryFn: async () => {
      const res = await fetch("/api/admin/mfa/config");
      if (!res.ok) throw new Error("Failed to fetch MFA security data");
      return res.json();
    },
  });

  // Calculate security score
  const securityScore = Math.min(
    100,
    Math.max(0, 100 - (data?.stats?.failedLogins || 0) * 2)
  );

  const recentLogins = data?.recentLogins || [];
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle security settings - initialize from MFA config API
  const [formState, setFormState] = useState({
    is2FAEnabled : MFAData?.config?.is2FAEnabled || false,
    isAdmin2FARequired : MFAData?.config?.isAdmin2FARequired || false,
    isPasswordPolicyEnabled : data?.settings?.isPasswordPolicyEnabled || false,
    forceLogout : data?.settings?.forceLogout || false,
  });

  //IP Whitelist
  const [ipWhitelist, setIpWhitelist] = useState({
    adminAccessByIP: false,
    requestsPerMinute: 100,
  });

  //session management
  const [sessionManagement, setSessionManagement] = useState({
    timeout: 30,
    concurrentSessions: 5,

  });

  // Sync local state when MFA data loads
  useEffect(() => {
    if (MFAData?.config) {
      setFormState({
        ...formState,
        is2FAEnabled : MFAData.config.is2FAEnabled || false,
        isAdmin2FARequired : MFAData.config.isAdmin2FARequired || false,
        isPasswordPolicyEnabled : data?.settings?.isPasswordPolicyEnabled || false,
        forceLogout : data?.settings?.forceLogout || false,
      });
    }
  }, [MFAData]);

  // Handle security settings change
  const handleSecuritySettingChange = async (setting: string, value: boolean | number | string) => {
    await fetch("/api/admin/security", {
      method: "POST",
      body: JSON.stringify({ setting, value }),
    });
  };

  //Handle security Mfa settings change
  const handleMFASettingChange = async (data: { isAdmin2FARequired: boolean, is2FAEnabled: boolean }) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/mfa/config", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update MFA settings");
      toast.success("MFA settings updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update MFA settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || mfaLoading) {
    return <LoadingShimmer />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Platform security settings and controls" 
        action={
          <Button key="refresh" 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() =>{
              refetch();
              mfaRefetch();
            }}>
              {isRefetching || mfaIsRefetching ? 
                <><LoaderPinwheel className="h-4 w-4 animate-spin" /> Refreshing...</> 
                :<> <RefreshCw className="h-4 w-4" /> Refresh </>
              }
          </Button>
        }/>

      {/* Security Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-emerald-200/60 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/10 p-6 shadow-sm"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <path className="text-emerald-200 dark:text-emerald-800/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path className="text-emerald-500" strokeDasharray={`${securityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {isLoading ? "-" : securityScore}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Security Score: Good</h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400/80">3 recommendations available to improve security</p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">2FA: Partial</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">SSL: Active</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">WAF: Active</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Failed Logins (24h)" value={isLoading ? "-" : data?.stats?.failedLogins || 0} icon={Ban} color="rose" delay={0} />
        <StatsCard title="Blocked IPs" value={isLoading ? "-" : data?.stats?.blockedIPs || 0} icon={Globe} color="amber" delay={0.1} />
        <StatsCard title="Active Sessions" value={isLoading ? "-" : data?.stats?.activeSessions || 0} icon={Users} color="blue" delay={0.2} />
        <StatsCard title="API Keys" value={isLoading ? "-" : data?.stats?.apiKeys || 0} icon={Key} color="purple" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2FA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
        >
          <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4 flex flex-row justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Fingerprint className="h-4 w-4" /> Two-Factor Authentication
            </h3>
            <Button variant='ghost' size='sm' 
              disabled={!formState.isAdmin2FARequired && !formState.is2FAEnabled} 
              className="text-emerald-500 dark:text-emerald-400 cursor-pointer rounded-full bg-transparent "
              onClick={() => {
                handleMFASettingChange({ 
                  isAdmin2FARequired: formState.isAdmin2FARequired, 
                  is2FAEnabled: formState.is2FAEnabled 
                });
              }}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheckBig className="h-4 w-4" />}
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Require 2FA for Admins</p><p className="text-xs text-slate-500">Enforce 2FA for all admin accounts</p></div>
              <Switch checked={formState.isAdmin2FARequired} onCheckedChange={() => {
                  setFormState({
                    ...formState,
                    isAdmin2FARequired : !formState.isAdmin2FARequired,
                  });
              }} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Require 2FA for Users</p><p className="text-xs text-slate-500">Enforce 2FA for all user accounts</p></div>
              <Switch checked={formState.is2FAEnabled} onCheckedChange={() => {
                  setFormState({
                    ...formState,
                    is2FAEnabled : !formState.is2FAEnabled,
                  });
              }} />
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {MFAData?.config?.enabled
                  ? `${(data?.stats?.adminWithoutMFA || 0)} admin accounts do not have 2FA enabled`
                  : "MFA is not enforced globally. Enable it above to require 2FA."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Session Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
        >
          <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Session Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Session Timeout</p><p className="text-xs text-slate-500">Auto-logout after inactivity</p></div>
              <span className="text-sm font-medium">30 minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Max Concurrent Sessions</p><p className="text-xs text-slate-500">Per user limit</p></div>
              <span className="text-sm font-medium">
                <Input value={sessionManagement.concurrentSessions.toString()} 
                  className="w-20 text-[12px] border-0"
                  min={1}
                  max={100}
                  type="number"
                  onChange={(value) => {
                    setSessionManagement({ ...sessionManagement, concurrentSessions: Number(value) });
                    handleSecuritySettingChange("concurrentSessions", Number(value));
                  }} />
                sessions
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Force Logout on Password Change</p></div>
              <Switch checked={formState.forceLogout} onCheckedChange={() => {
                setFormState({
                  ...formState,
                  forceLogout : !formState.forceLogout,
                });
                handleSecuritySettingChange("forceLogout", !formState.forceLogout);
              }} />
            </div>
          </div>
        </motion.div>

        {/* IP Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
        >
          <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> IP Security</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">IP Whitelist</p><p className="text-xs text-slate-500">Restrict admin access by IP</p></div>
              <Switch checked={ipWhitelist.adminAccessByIP} onCheckedChange={() => {
                setIpWhitelist({ ...ipWhitelist, adminAccessByIP: !ipWhitelist.adminAccessByIP });
                handleSecuritySettingChange("adminAccessByIP", !ipWhitelist.adminAccessByIP);
              }} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Rate Limiting</p><p className="text-xs text-slate-500">{ipWhitelist.requestsPerMinute} requests per minute</p></div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Failed Login Lockout</p><p className="text-xs text-slate-500">After 5 failed attempts</p></div>
              <Switch checked={formState.isPasswordPolicyEnabled} onCheckedChange={() => {
                setFormState({
                  ...formState,
                  isPasswordPolicyEnabled : !formState.isPasswordPolicyEnabled,
                });
                handleSecuritySettingChange("isPasswordPolicyEnabled", !formState.isPasswordPolicyEnabled);
              }} />
            </div>
          </div>
        </motion.div>

        {/* Recent Login Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
        >
          <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
            <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Recent Login Activity</h3>
          </div>
          <div className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60">
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">User</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">IP Address</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Time</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">Loading login activity...</td>
                  </tr>
                ) : recentLogins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">No recent login activity</td>
                  </tr>
                ) : (
                  recentLogins.map((login: any, i: number) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/30 last:border-0">
                      <td className="px-4 py-2.5 text-sm">{login.user}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{login.ip}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{login.time}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          login.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                          login.status === "failed" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                          "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                        }`}>
                          {login.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Active Sessions Monitor */}
        <ActiveSessionsMonitor />
      </div>
    </div>
  );
}

// Inline component for active sessions monitor
function ActiveSessionsMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-sessions-monitor"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sessions?limit=20");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success("Session revoked");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const sessions = data?.sessions || [];

  const deviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone className="h-4 w-4" />;
    if (type === "tablet") return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden lg:col-span-2"
    >
      <div className="border-b border-slate-100 dark:border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4" /> Active Sessions Monitor
        </h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/60">
              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">User</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Device</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">IP</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Last Active</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Status</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading sessions...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No active sessions</td></tr>
            ) : (
              sessions.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/30 last:border-0">
                  <td className="px-4 py-2.5 text-sm">
                    <div className="font-medium">{s.user?.name || "Unknown"}</div>
                    <div className="text-xs text-slate-500">{s.user?.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      {deviceIcon(s.deviceType)}
                      <span>{s.browser} / {s.os}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{s.ipAddress}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(s.lastActivityAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      s.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      onClick={() => handleRevoke(s.id)}
                      disabled={revokingId === s.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
