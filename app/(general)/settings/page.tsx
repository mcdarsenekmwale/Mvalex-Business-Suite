// app/(general)/(dashboard)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Globe,
  Moon,
  Sun,
  Bell,
  Shield,
  CreditCard,
  Key,
  Save,
  Palette,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Globe },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "pt", label: "Português" },
  { value: "ru", label: "Русский" },
  { value: "tr", label: "Türkçe" },
  { value: "vi", label: "Tiếng Việt" },
];

const TIMEZONES = Intl.supportedValuesOf?.("timeZone") || [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", credits: 100, price: 9.99, currency: "USD", popular: false },
  { id: "basic", name: "Basic", credits: 250, price: 19.99, currency: "USD", bonus: 25, popular: false },
  { id: "pro", name: "Pro", credits: 500, price: 39.99, currency: "USD", bonus: 75, popular: true },
  { id: "business", name: "Business", credits: 1200, price: 89.99, currency: "USD", bonus: 200, popular: false },
];

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  language: string;
  timezone: string;
  theme: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  creditsBalance: number;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("pro");

  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: "system",
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
  });

  // Security state
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // MFA status
  const { data: mfaStatusData } = useQuery({
    queryKey: ["mfa-status"],
    queryFn: async () => {
      const res = await fetch("/api/mfa/status");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: activeTab === "security",
  });

  // Fetch user settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const res = await fetch("/api/user/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Fetch credits balance
  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ["user-credits"],
    queryFn: async () => {
      const res = await fetch("/api/user/credits");
      if (!res.ok) throw new Error("Failed to fetch credits");
      return res.json();
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Profile updated successfully!");
      updateSession({
        ...session,
        user: { ...session?.user, name: data.data.name },
      });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Preferences saved!");
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save preferences");
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to change password");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  // Initialize form with settings data
  useEffect(() => {
    console.log(settingsData);
    console.log(session);
    if (settingsData?.data) {
      const data = settingsData.data;
      setProfile({
        name: data.name || session?.user?.name || "",
        email: data.email || session?.user?.email || "",
        language: data.language || "en",
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setPreferences({
        theme: data.theme || "system",
        emailNotifications: data.emailNotifications !== false,
        pushNotifications: data.pushNotifications || false,
        marketingEmails: data.marketingEmails || false,
      });
    }
  }, [settingsData, session]);

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateProfileMutation.mutate({
      name: profile.name,
      language: profile.language,
      timezone: profile.timezone,
    });
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate({
      theme: preferences.theme,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      marketingEmails: preferences.marketingEmails,
    });
  };

  const handleChangePassword = () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (security.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: security.currentPassword,
      newPassword: security.newPassword,
    });
  };

  const handlePurchaseCredits = async () => {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage }),
      });
      const data = await res.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    }
  };

  const creditsBalance = creditsData?.balance || 0;

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-[400px]" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {(profile.name || profile.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Profile picture</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, GIF or PNG. Max size 2MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support for assistance.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={profile.language}
                    onValueChange={(value) => setProfile({ ...profile, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={profile.timezone}
                    onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="gap-2"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Credits & Billing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Credits & Billing
              </CardTitle>
              <CardDescription>
                Manage your credits and purchase additional credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
                <div>
                  <p className="text-sm text-muted-foreground">Available Credits</p>
                  <p className="text-3xl font-bold">{creditsBalance.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    ~{Math.floor(creditsBalance / 10)} days remaining
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Purchase Credits</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CREDIT_PACKAGES.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        selectedPackage === pkg.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      {pkg.popular && (
                        <Badge className="absolute -top-2 right-3 text-xs">
                          Popular
                        </Badge>
                      )}
                      <div className="font-semibold text-lg">{pkg.name}</div>
                      <div className="text-2xl font-bold mt-1">
                        ${pkg.price}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.credits.toLocaleString()} credits
                      </div>
                      {pkg.bonus && (
                        <div className="text-xs text-primary mt-1">
                          +{pkg.bonus} bonus credits
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handlePurchaseCredits}
                className="w-full gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Purchase Credits
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how Mvalex Business Suite looks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setPreferences({ ...preferences, theme: theme.value })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                        preferences.theme === theme.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <theme.icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive email updates about your account activity
                  </div>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, emailNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Get real-time notifications in your browser
                  </div>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, pushNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <div className="font-medium">Marketing Emails</div>
                  <div className="text-sm text-muted-foreground">
                    Receive tips, offers, and product updates
                  </div>
                </div>
                <Switch
                  checked={preferences.marketingEmails}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketingEmails: checked })
                  }
                />
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={updatePreferencesMutation.isPending}
                className="gap-2 mt-4"
              >
                {updatePreferencesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Multi-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <Shield className={`h-5 w-5 ${mfaStatusData?.enabled ? "text-emerald-500" : "text-slate-400"}`} />
                  <div>
                    <p className="font-medium">
                      {mfaStatusData?.enabled ? "MFA is Enabled" : "MFA is Disabled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mfaStatusData?.enabled
                        ? `Method: ${mfaStatusData.method}`
                        : "Protect your account with two-factor authentication"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={mfaStatusData?.enabled ? "outline" : "default"}
                  className="gap-1"
                  onClick={() => window.location.href = "/auth/mfa/setup"}
                >
                  {mfaStatusData?.enabled ? "Manage" : "Set Up"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={security.currentPassword}
                  onChange={(e) =>
                    setSecurity({ ...security, currentPassword: e.target.value })
                  }
                  placeholder="Enter your current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={security.newPassword}
                  onChange={(e) =>
                    setSecurity({ ...security, newPassword: e.target.value })
                  }
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={security.confirmPassword}
                  onChange={(e) =>
                    setSecurity({ ...security, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm your new password"
                />
              </div>
              {security.newPassword && security.confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {security.newPassword === security.confirmPassword ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
              <Button
                onClick={handleChangePassword}
                disabled={
                  changePasswordMutation.isPending ||
                  !security.currentPassword ||
                  !security.newPassword ||
                  !security.confirmPassword ||
                  security.newPassword !== security.confirmPassword ||
                  security.newPassword.length < 8
                }
                className="gap-2"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible account actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const res = await fetch("/api/user/account", { method: "DELETE" });
                  if (!res.ok) throw new Error("Failed to delete account");
                  window.location.href = "/";
                } catch (error) {
                  toast.error("Failed to delete account");
                }
              }}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}