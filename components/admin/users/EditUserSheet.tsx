// components/admin/users/EditUserSheet.tsx
"use client";

import { JSX, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
 UserIcon,
  Shield,
  Coins,
  Calendar,
  Clock,
  Activity,
  CreditCard,
  FileText,
  Palette,
  Download,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserX,
} from "lucide-react";
import { format } from "date-fns";
import { User, Role } from "@/lib/types";

interface EditUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  roles: Role[];
  onSave: (data: any) => void;
  isSaving: boolean;
  getRoleIcon: (role: string) => JSX.Element;
}

export function EditUserSheet({
  open,
  onOpenChange,
  user,
  roles,
  onSave,
  isSaving,
  getRoleIcon,
}: EditUserSheetProps) {
  
  // Form data
  const [emailVerified, setEmailVerified] = useState(!!user?.emailVerified || false);
  const [formData, setFormData] = useState({
    name: "",
    status: "",
    roleId: "",
    creditsBalance: 0,
  });
  const [activeTab, setActiveTab] = useState("general");

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        status: user.status,
        roleId: user.roles?.[0]?.id || "",
        creditsBalance: user.creditsBalance,
      });
    }
  }, [user]);

  const handleSave = () => {
    onSave({
      userId: user?.id,
      ...formData,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "SUSPENDED": return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "INACTIVE": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      case "PENDING_VERIFICATION": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Edit User
          </SheetTitle>
          <SheetDescription>
            Manage user information, role, permissions, and account settings
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="mt-6 space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{user.name || "Unnamed User"}</h3>
                  <Badge className={getStatusColor(user.status)}>
                    {user.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </span>
                  {user.lastLoginAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last login {format(new Date(user.lastLoginAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="role">Role & Permissions</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={user.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support for email updates.</p>
                </div>
                <div className="space-y-2">
                  <Label>Account Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active - Full access</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended - Cannot access</SelectItem>
                      <SelectItem value="INACTIVE">Inactive - Limited access</SelectItem>
                      <SelectItem value="PENDING_VERIFICATION">Pending Verification - Email not verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Credits Balance</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.creditsBalance}
                      onChange={(e) => setFormData({ ...formData, creditsBalance: parseInt(e.target.value) || 0 })}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Credits are used for generating assets and exports</p>
                </div>
              </TabsContent>

              {/* Role & Permissions Tab */}
              <TabsContent value="role" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Assign Role</Label>
                  <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(role.type)}
                            <span>{role.name}</span>
                            <span className="text-xs text-muted-foreground">({role.type})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {roles.find(r => r.id === formData.roleId)?.description}
                  </p>
                </div>

                <Separator />

                <div>
                  <Label className="mb-2 block">Role Permissions</Label>
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-3">
                      {/* Permission list would go here based on selected role */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Manage Users</span>
                        </div>
                        <Switch checked={formData.roleId === "admin"} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span className="text-sm">View Analytics</span>
                        </div>
                        <Switch checked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">Manage Templates</span>
                        </div>
                        <Switch checked={formData.roleId === "admin"} />
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center">
                    <FileText className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold">{user._count?.businessCards || 0}</div>
                    <div className="text-xs text-muted-foreground">Business Cards</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                    <FileText className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold">{user._count?.invoices || 0}</div>
                    <div className="text-xs text-muted-foreground">Invoices</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-center">
                    <Palette className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold">{user._count?.logos || 0}</div>
                    <div className="text-xs text-muted-foreground">Logos</div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-center">
                    <Download className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold">{user._count?.exports || 0}</div>
                    <div className="text-xs text-muted-foreground">Exports</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Credits Used</span>
                    <span className="font-semibold">-</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span>Account Created</span>
                    <span className="font-mono text-xs">{format(new Date(user.createdAt), "PPP")}</span>
                  </div>
                  {user.emailVerified && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span>Email Verified</span>
                      <Badge variant="outline" className="text-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold">Security Actions</h4>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Lock className="h-4 w-4 mr-2" />
                      Force Password Reset
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Revoke All Sessions
                    </Button>
                    <Button variant="destructive" size="sm" className="w-full justify-start">
                      <UserX className="h-4 w-4 mr-2" />
                      Suspend Account
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">2-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {user.emailVerified ? "2FA is enabled for this account" : "2FA is not enabled"}
                  </p>
                  <Switch 
                      checked={emailVerified}  
                      onCheckedChange={(checked) => setEmailVerified(!checked)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}