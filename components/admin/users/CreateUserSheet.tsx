// components/admin/users/CreateUserSheet.tsx
"use client";

import { JSX, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  Mail,
  Lock,
  Shield,
  Coins,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Role } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";


interface CreateUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  onCreate: (data: any) => void;
  isCreating: boolean;
  getRoleIcon: (role: string) => JSX.Element;
}

// Password generator utility
const generatePassword = (length: number = 12): string => {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = "";
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const passwordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const percentage = (score / 5) * 100;
  
  if (percentage < 40) return { score: percentage, label: "Weak", color: "bg-red-500" };
  if (percentage < 70) return { score: percentage, label: "Medium", color: "bg-yellow-500" };
  return { score: percentage, label: "Strong", color: "bg-green-500" };
};

export function CreateUserSheet({
  open,
  onOpenChange,
  roles,
  onCreate,
  isCreating,
  getRoleIcon,
}: CreateUserSheetProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    credits: 100,
    sendWelcomeEmail: true,
    requirePasswordChange: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [generatedPassword, setGeneratedPassword] = useState("");

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12);
    setGeneratedPassword(newPassword);
    setFormData({ ...formData, password: newPassword });
  };

  const handleCopyPassword = async () => {
    if (formData.password) {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const handleCreate = () => {
    if (!formData.email || !formData.password || !formData.roleId) {
      toast.error("Please fill in all required fields");
      return;
    }
    onCreate(formData);
  };

  const passwordStrengthData = passwordStrength(formData.password);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create New User
          </SheetTitle>
          <SheetDescription>
            Add a new user to the platform with custom role and permissions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="mt-6 space-y-6">
              {/* Quick Setup Card */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Quick Setup</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Fill in the essential information to create a new user account
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-primary" />
                    <span>Email required</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Lock className="h-3 w-3 text-primary" />
                    <span>Password required</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="h-3 w-3 text-primary" />
                    <span>Role required</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Coins className="h-3 w-3 text-primary" />
                    <span>Initial credits optional</span>
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">User Details</TabsTrigger>
                  <TabsTrigger value="options">Options & Permissions</TabsTrigger>
                </TabsList>

                {/* User Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password or generate one"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-9 pr-24"
                        required
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleGeneratePassword}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Password Generator Row */}
                    {generatedPassword && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/50">
                        <code className="text-xs font-mono flex-1">{generatedPassword}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={handleCopyPassword}
                        >
                          {passwordCopied ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Copy
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={handleGeneratePassword}
                        >
                          <RefreshCw className="h-3 w-3" />
                          New
                        </Button>
                      </div>
                    )}
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Password strength:</span>
                          <span className={cn(
                            "font-medium",
                            passwordStrengthData.label === "Weak" && "text-red-500",
                            passwordStrengthData.label === "Medium" && "text-yellow-500",
                            passwordStrengthData.label === "Strong" && "text-green-500"
                          )}>
                            {passwordStrengthData.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-300", passwordStrengthData.color)}
                            style={{ width: `${passwordStrengthData.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use 8+ characters with uppercase, numbers, and symbols for strong password
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Role *</Label>
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
                            <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Initial Credits</Label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.credits}
                        onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">New users will start with this credit balance</p>
                  </div>
                </TabsContent>

                {/* Options & Permissions Tab */}
                <TabsContent value="options" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Send Welcome Email</Label>
                        <p className="text-xs text-muted-foreground">Send an email with login instructions</p>
                      </div>
                      <Switch
                        checked={formData.sendWelcomeEmail}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendWelcomeEmail: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require Password Change</Label>
                        <p className="text-xs text-muted-foreground">User must change password on first login</p>
                      </div>
                      <Switch
                        checked={formData.requirePasswordChange}
                        onCheckedChange={(checked) => setFormData({ ...formData, requirePasswordChange: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 block">Role Permissions Preview</Label>
                    <div className="rounded-md border p-4 space-y-2">
                      {formData.roleId && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>Access to user dashboard</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>Create business cards</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>Generate invoices</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>AI logo generation</span>
                          </div>
                          {formData.roleId !== roles.find(r => r.type === "USER")?.id && (
                            <>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span>Access to admin panel</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span>Manage users</span>
                              </div>
                            </>
                          )}
                          {formData.roleId === roles.find(r => r.type === "SUPER_ADMIN")?.id && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="h-2 w-2 rounded-full bg-purple-500" />
                              <span>Full system access</span>
                            </div>
                          )}
                        </>
                      )}
                      {!formData.roleId && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Select a role to preview permissions
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        Users can be assigned additional permissions after creation
                      </span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
        </ScrollArea>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="bg-primary text-white">
            {isCreating ? "Creating..." : "Create User"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}