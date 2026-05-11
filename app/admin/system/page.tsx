"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Globe,
  Mail,
  ToggleLeft,
  Shield,
  Cloud,
  RefreshCw,
  Key,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { ChartCard } from "@/components/admin/shared/ChartCard";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LoadingShimmer } from "@/components/shared/ui/loading-shimmer";

interface SettingsData {
  appName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  enableRegistration: boolean;
  enableBusinessCard: boolean;
  enableInvoice: boolean;
  enableAILogo: boolean;
  enableAIAssistant: boolean;
  enableAI: boolean;
  enforce2FAAdmins: boolean;
  enforce2FAUsers: boolean;
  ipWhitelist: boolean;
  maxFileSize: number;
  sessionTimeout: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  integrations: {
    openai: boolean;
    stripe: boolean;
    awsS3: boolean;
    sendgrid: boolean;
  };
  [key: string]: any;
}

const settingTabs = [
  { id: "general", label: "General", icon: Globe },
  { id: "email", label: "Email", icon: Mail },
  { id: "features", label: "Features", icon: ToggleLeft },
  { id: "integrations", label: "Integrations", icon: Cloud },
  { id: "security", label: "Security", icon: Shield },
];

const defaultForm = {
  appName: "",
  supportEmail: "",
  defaultLanguage: "English",
  defaultCurrency: "USD ($)",
  maintenanceMode: false,
  enableRegistration: true,
  requireEmailVerification: true,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  fromName: "",
  fromEmail: "",
  enableBusinessCard: true,
  enableInvoice: true,
  enableAILogo: true,
  enableAI: true,
  enableAIAssistant: true,
  enablePremiumTemplates: true,
  enableCreditPurchases: true,
  enableSocialLogin: true,
  enablePublicAPI: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  enforce2FAAdmins: false,
  enforce2FAUsers: false,
  ipWhitelist: false,
};

const featureFlags = [
  { name: "Business Card Generator", desc: "Allow users to create business cards", key: "enableBusinessCard" as const },
  { name: "Invoice Generator", desc: "Allow users to create invoices", key: "enableInvoice" as const },
  { name: "AI Logo Generator", desc: "Allow users to generate AI logos", key: "enableAILogo" as const },
  { name: "AI Assistant", desc: "Allow users to use AI chat", key: "enableAIAssistant" as const },
  { name: "Premium Templates", desc: "Allow access to premium templates", key: "enablePremiumTemplates" as const },
  { name: "Credit Purchases", desc: "Allow users to buy credits", key: "enableCreditPurchases" as const },
  { name: "Social Login", desc: "Allow Google/GitHub OAuth", key: "enableSocialLogin" as const },
  { name: "Public API", desc: "Enable public API endpoints", key: "enablePublicAPI" as const },
];

const integrationList = [
  { name: "OpenAI API", key: "sk-••••••••••••••••••••••••••••••", envKey: "openai" as const },
  { name: "Stripe", key: "sk_••••••••••••••••••••••••••••••", envKey: "stripe" as const },
  { name: "AWS S3", key: "AKIA••••••••••••", envKey: "awsS3" as const },
  { name: "SendGrid", key: "SG.••••••••••••••••••••••••••••••", envKey: "sendgrid" as const },
] as const;

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState(defaultForm);

  // Fetch settings
  const { data, isLoading, isRefetching, refetch } = useQuery<SettingsData>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Fetch MFA stats
  const { data: mfaStats } = useQuery({
    queryKey: ["mfa-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/mfa/stats");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: activeTab === "security",
  });

  useEffect(() => {
    if (data) {
      setForm((prev) => ({
        ...prev,
        appName: data.appName ?? prev.appName,
        supportEmail: data.supportEmail ?? prev.supportEmail,
        maintenanceMode: data.maintenanceMode ?? prev.maintenanceMode,
        enableRegistration: data.enableRegistration ?? prev.enableRegistration,
        enableAI: data.enableAI ?? prev.enableAI,
        sessionTimeout: data.sessionTimeout ?? prev.sessionTimeout,
        smtpHost: data.smtpHost ?? prev.smtpHost,
        smtpPort: data.smtpPort ?? prev.smtpPort,
        smtpUser: data.smtpUser ?? prev.smtpUser,
        fromName: data.appName ?? prev.fromName,
        fromEmail: data.supportEmail ?? prev.fromEmail,
        enableAILogo: data.enableAI ?? prev.enableAILogo,
        enableAIAssistant: data.enableAI ?? prev.enableAIAssistant,
        enableSocialLogin: data.enableRegistration ?? prev.enableSocialLogin,
        enforce2FAUsers: data.enforce2FAUsers ,
        enforce2FAAdmins: data.enforce2FAAdmins ,
        ipWhitelist: data.ipWhitelist ?? prev.ipWhitelist,
        ...data as any,
      }));
    }
  }, [data]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save settings");
    },
  });

  const handleChange = (key: keyof typeof defaultForm, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      appName: form.appName,
      supportEmail: form.supportEmail,
      maintenanceMode: form.maintenanceMode,
      enableRegistration: form.enableRegistration,
      enableAI: form.enableAI,
      sessionTimeout: form.sessionTimeout,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort,
      smtpUser: form.smtpUser,
      requireEmailVerification: form.requireEmailVerification,
      smtpPassword: form.smtpPassword,
      fromName: form.fromName,
      fromEmail: form.fromEmail,
      enableBusinessCard: form.enableBusinessCard,
      enableInvoice: form.enableInvoice,
      enableAILogo: form.enableAILogo,
      enableAIAssistant: form.enableAIAssistant,
      enablePremiumTemplates: form.enablePremiumTemplates,
      enableCreditPurchases: form.enableCreditPurchases,
      enableSocialLogin: form.enableSocialLogin,
      enablePublicAPI: form.enablePublicAPI,
      maxLoginAttempts: form.maxLoginAttempts,
      enforce2FAAdmins: form.enforce2FAAdmins,
      enforce2FAUsers: form.enforce2FAUsers,
      ipWhitelist: form.ipWhitelist,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Settings" subtitle="Configure platform-wide settings" />
        <LoadingShimmer/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure platform-wide settings"
        action={
          <div className="flex flex-row gap-3">
            <Button onClick={()=>refetch()} disabled={isRefetching} className="gap-1.5 text-white" variant='secondary'>
              <RefreshCw className={cn("h-4 w-4", { "animate-spin": isRefetching })} />
              {isRefetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-1.5 bg-primary text-white">
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-56 space-y-1"
        >
          {settingTabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id + index}
                variant={'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </motion.div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeTab === "general" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ChartCard title="General Settings" subtitle="Site identity and basic configuration" delay={0}>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Site Name</Label><Input value={form.appName} onChange={(e) => handleChange("appName", e.target.value)} /></div>
                    <div><Label>Support Email</Label><Input value={form.supportEmail} onChange={(e) => handleChange("supportEmail", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Default Language</Label>
                      <Select value={form.defaultLanguage} onValueChange={(value) => handleChange("defaultLanguage", value)}>
                        <SelectTrigger className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" >
                          <SelectValue  placeholder={form.defaultLanguage || "Default Language"}/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="vi">Vietnamese</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="tr">Türkçe</SelectItem>
                          
                          <SelectItem value="zh">中文</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Default Currency</Label>
                      <Select value={form.defaultCurrency} onValueChange={(value) => handleChange("defaultCurrency", value)} >
                        <SelectTrigger className="px-3 py-2 border rounded-md w-full" >
                          <SelectValue  placeholder={form.defaultCurrency || "Default Currency"}/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD ($)"><div className="flex items-center gap-2">USD ($)</div></SelectItem>
                          <SelectItem value="CNY (¥)"><div className="flex items-center gap-2">CNY (¥)</div></SelectItem>
                          <SelectItem value="EUR (€)"><div className="flex items-center gap-2">EUR (€)</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div><p className="font-medium">Maintenance Mode</p><p className="text-xs text-slate-500">Show maintenance page to all visitors</p></div>
                    <Switch checked={form.maintenanceMode} onCheckedChange={(checked) => handleChange("maintenanceMode", checked)} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div><p className="font-medium">User Registrations</p><p className="text-xs text-slate-500">Allow new users to sign up</p></div>
                    <Switch checked={form.enableRegistration} onCheckedChange={(checked) => handleChange("enableRegistration", checked)} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div><p className="font-medium">Require Email Verification</p><p className="text-xs text-slate-500">New users must verify email before access</p></div>
                    <Switch checked={form.requireEmailVerification} onCheckedChange={(checked) => handleChange("requireEmailVerification", checked)} />
                  </div>
                </div>
              </ChartCard>
            </motion.div>
          )}

          {activeTab === "email" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ChartCard title="Email Configuration" subtitle="SMTP and notification settings" delay={0}>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>SMTP Host</Label><Input value={form.smtpHost} onChange={(e) => handleChange("smtpHost", e.target.value)} /></div>
                    <div><Label>SMTP Port</Label><Input type="number" value={form.smtpPort} onChange={(e) => handleChange("smtpPort", Number(e.target.value))} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>SMTP Username</Label><Input value={form.smtpUser} onChange={(e) => handleChange("smtpUser", e.target.value)} /></div>
                    <div><Label>SMTP Password</Label><Input type="password" value={form.smtpPassword} onChange={(e) => handleChange("smtpPassword", e.target.value)} /></div>
                  </div>
                  <div><Label>From Name</Label><Input value={form.fromName} onChange={(e) => handleChange("fromName", e.target.value)} /></div>
                  <div><Label>From Email</Label><Input value={form.fromEmail} onChange={(e) => handleChange("fromEmail", e.target.value)} /></div>
                </div>
              </ChartCard>
            </motion.div>
          )}

          {activeTab === "features" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ChartCard title="Feature Flags" subtitle="Enable or disable platform features" delay={0}>
                <div className="space-y-3">
                  {featureFlags.map((feature) => (
                    <div key={feature.name} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                      <div><p className="font-medium">{feature.name}</p><p className="text-xs text-slate-500">{feature.desc}</p></div>
                      <Switch checked={form[feature.key]} onCheckedChange={(checked) => handleChange(feature.key, checked)} />
                    </div>
                  ))}
                </div>
              </ChartCard>
            </motion.div>
          )}

          {activeTab === "integrations" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ChartCard title="Third-Party Integrations" subtitle="API keys and service connections" delay={0}>
                <div className="space-y-5">
                  {integrationList.map((integration) => {
                    const isConnected = data?.integrations?.[integration.envKey];
                    return (
                      <div key={integration.name} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{integration.key}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${isConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          {isConnected ? "Connected" : "Not Connected"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {mfaStats && (
                <ChartCard title="MFA Statistics" subtitle="Multi-factor authentication overview" delay={0}>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mfaStats.totalEnrolled || 0}</p>
                      <p className="text-xs text-slate-500">Enrolled Users</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mfaStats.enrolledAdmins || 0}</p>
                      <p className="text-xs text-slate-500">Enrolled Admins</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mfaStats.verifiedToday || 0}</p>
                      <p className="text-xs text-slate-500">Verified Today</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mfaStats.activeDevices || 0}</p>
                      <p className="text-xs text-slate-500">Trusted Devices</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mfaStats.pendingSetup || 0}</p>
                      <p className="text-xs text-slate-500">Pending Setup</p>
                    </div>
                  </div>
                </ChartCard>
              )}
              <ChartCard title="Security Settings" subtitle="Authentication and session policies" delay={0}>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Session Timeout (minutes)</Label><Input type="number" value={form.sessionTimeout} onChange={(e) => handleChange("sessionTimeout", Number(e.target.value))} /></div>
                    <div><Label>Max Login Attempts</Label><Input type="number" value={form.maxLoginAttempts} onChange={(e) => handleChange("maxLoginAttempts", Number(e.target.value))} /></div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div><p className="font-medium">Enforce 2FA for Admins</p><p className="text-xs text-slate-500">Require two-factor for admin accounts</p></div>
                    <Switch checked={form.enforce2FAAdmins}  onCheckedChange={(checked) => handleChange("enforce2FAAdmins", checked)} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div><p className="font-medium">Enforce 2FA for Users</p><p className="text-xs text-slate-500">Require two-factor for all accounts</p></div>
                    <Switch checked={form.enforce2FAUsers} onCheckedChange={(checked) => handleChange("enforce2FAUsers", checked)} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div><p className="font-medium">IP Whitelist</p><p className="text-xs text-slate-500">Restrict admin access by IP address</p></div>
                    <Switch checked={form.ipWhitelist} onCheckedChange={(checked) => handleChange("ipWhitelist", checked)} />
                  </div>
                </div>
              </ChartCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
