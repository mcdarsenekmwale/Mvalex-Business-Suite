// app/(admin)/roles/permissions/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key,
  Shield,
  Search,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Grid3x3,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { cn } from "@/lib/utils";

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
}

const RESOURCE_GROUPS: Record<string, { icon: string; label: string; color: string }> = {
  users: { icon: "👥", label: "User Management", color: "bg-blue-500" },
  businessCards: { icon: "💳", label: "Business Cards", color: "bg-emerald-500" },
  invoices: { icon: "📄", label: "Invoices", color: "bg-purple-500" },
  logos: { icon: "🎨", label: "Logos", color: "bg-rose-500" },
  templates: { icon: "📋", label: "Templates", color: "bg-amber-500" },
  tickets: { icon: "🎫", label: "Support Tickets", color: "bg-cyan-500" },
  admin: { icon: "⚙️", label: "Administration", color: "bg-slate-500" },
  system: { icon: "🔧", label: "System", color: "bg-gray-500" },
  audit: { icon: "📊", label: "Audit", color: "bg-indigo-500" },
};

export default function PermissionsManagementPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [permissionChanges, setPermissionChanges] = useState<Set<string>>(new Set());

  // Fetch all roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  // Fetch all permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/permissions");
      if (!res.ok) throw new Error("Failed to fetch permissions");
      return res.json();
    },
  });

  // Fetch role permissions
  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ["admin-role-permissions", selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await fetch(`/api/admin/roles/${selectedRole}/permissions`);
      if (!res.ok) throw new Error("Failed to fetch role permissions");
      return res.json();
    },
    enabled: !!selectedRole,
  });

  // Fetch permission stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-permissions-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/permissions/stats");
      if (!res.ok) throw new Error("Failed to fetch permission stats");
      return res.json();
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds }),
      });
      if (!res.ok) throw new Error("Failed to update permissions");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Permissions updated successfully!");
      setPermissionChanges(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-role-permissions", selectedRole] });
      queryClient.invalidateQueries({ queryKey: ["admin-permissions-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update permissions");
    },
  });

  const roles: Role[] = rolesData?.roles || [];
  const permissions: Permission[] = permissionsData?.permissions || [];
  const rolePermissions: RolePermission[] = rolePermissionsData?.permissions || [];
  const stats = statsData?.stats || {
    totalPermissions: 0,
    totalRoles: 0,
    averagePermissionsPerRole: 0,
    mostAssignedPermission: "N/A",
  };

  const selectedRoleData = roles.find(r => r.id === selectedRole);
  const currentPermissions = new Set(rolePermissions.map(rp => rp.permissionId));

  const handlePermissionToggle = (permissionId: string, isChecked: boolean) => {
    if (isChecked) {
      currentPermissions.add(permissionId);
    } else {
      currentPermissions.delete(permissionId);
    }
    permissionChanges.add(permissionId);
    setPermissionChanges(new Set(permissionChanges));
  };

  const handleSave = () => {
    if (!selectedRole) {
      toast.error("Please select a role first");
      return;
    }
    updatePermissionsMutation.mutate({
      roleId: selectedRole,
      permissionIds: Array.from(currentPermissions),
    });
  };

  const handleSelectAll = () => {
    permissions.forEach(p => currentPermissions.add(p.id));
    setPermissionChanges(new Set(permissions.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    currentPermissions.clear();
    setPermissionChanges(new Set(permissions.map(p => p.id)));
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredPermissions = searchQuery
    ? permissions.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : permissions;

  const isLoading = rolesLoading || permissionsLoading || statsLoading;

  if (isLoading && roles.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Permissions" subtitle="Manage role-based permissions" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Permissions"
        subtitle="Manage role-based access control permissions"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
                queryClient.invalidateQueries({ queryKey: ["admin-role-permissions", selectedRole] });
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {selectedRole && (
              <Button
                onClick={handleSave}
                disabled={updatePermissionsMutation.isPending || permissionChanges.size === 0}
                className="gap-2"
              >
                {updatePermissionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Permissions" value={stats.totalPermissions} icon={Key} color="blue" delay={0} />
        <StatsCard title="Total Roles" value={stats.totalRoles} icon={Shield} color="purple" delay={0.1} />
        <StatsCard title="Avg Permissions/Role" value={stats.averagePermissionsPerRole} icon={Key} color="green" delay={0.2} />
        <StatsCard title="Most Used Permission" value={stats.mostAssignedPermission} icon={CheckCircle2} color="amber" delay={0.3} />
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Role</CardTitle>
          <CardDescription>Choose a role to view and edit its permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  selectedRole === role.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Shield className={cn("h-4 w-4", selectedRole === role.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-medium text-sm">{role.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {role.description || "No description"}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Display */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Permissions for {selectedRoleData?.name}
                </CardTitle>
                <CardDescription>
                  Grant or revoke permissions for this role
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
                <div className="flex gap-1 border rounded-md p-1">
                  <button
                    onClick={() => setViewMode("grouped")}
                    className={cn(
                      "p-1.5 rounded",
                      viewMode === "grouped" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded",
                      viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {viewMode === "grouped" ? (
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => {
                    const resourceInfo = RESOURCE_GROUPS[resource] || {
                      icon: "📦",
                      label: resource.charAt(0).toUpperCase() + resource.slice(1),
                      color: "bg-gray-500",
                    };
                    const filteredPerms = searchQuery ? perms.filter(p => 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ) : perms;
                    
                    if (filteredPerms.length === 0) return null;
                    
                    return (
                      <div key={resource} className="border rounded-lg overflow-hidden">
                        <div className={cn("px-4 py-2 text-white", resourceInfo.color)}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{resourceInfo.icon}</span>
                            <span className="font-semibold">{resourceInfo.label}</span>
                            <Badge variant="secondary" className="ml-2">
                              {filteredPerms.length} permissions
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredPerms.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                              >
                                <div>
                                  <p className="text-sm font-medium">{permission.name}</p>
                                  {permission.description && (
                                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                                  )}
                                </div>
                                <Switch
                                  checked={currentPermissions.has(permission.id)}
                                  onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredPermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {permission.resource}:{permission.action}
                          </Badge>
                          <span className="font-medium">{permission.name}</span>
                        </div>
                        {permission.description && (
                          <p className="text-xs text-muted-foreground mt-1">{permission.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={currentPermissions.has(permission.id)}
                        onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}