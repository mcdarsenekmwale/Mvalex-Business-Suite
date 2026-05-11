// app/(admin)/users/roles/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Lock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Role {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  roles: Role[];
  assignedAt: string;
}

export default function UserRolesManagementPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "USER",
    description: "",
  });

  // Fetch all roles
  const { data: rolesData, isLoading: rolesLoading, refetch: refetchRoles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  // Fetch users with roles
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-with-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?includeRoles=true&limit=100");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch role statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-roles-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles/stats");
      if (!res.ok) throw new Error("Failed to fetch role stats");
      return res.json();
    },
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role created successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create role");
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role updated successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role deleted successfully!");
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete role");
    },
  });

  // Assign role to user mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) throw new Error("Failed to assign role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign role");
    },
  });

  // Remove role from user mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role removed successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove role");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "USER",
      description: "",
    });
    setIsEditing(false);
    setSelectedRole(null);
    setDialogOpen(false);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      type: role.type,
      description: role.description || "",
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (isEditing && selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const roles: Role[] = rolesData?.roles || [];
  const users: User[] = usersData?.users || [];
  const stats = statsData?.stats || {
    totalRoles: 0,
    totalUsersWithRoles: 0,
    averageUsersPerRole: 0,
    systemRoles: 0,
    customRoles: 0,
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isLoading = rolesLoading || usersLoading || statsLoading;

  if (isLoading && roles.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Roles" subtitle="Manage system roles and assignments" />
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
        title="User Roles"
        subtitle="Manage system roles and user assignments"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRoles()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"  onClick={() => resetForm()}
                  className="bg-primary text-white gap-2"
                  >
                  <Plus className="h-4 w-4" />
                  New Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditing ? "Edit Role" : "Create New Role"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Role Name *</Label>
                    <Input
                      placeholder="e.g., MANAGER, SUPPORT_LEAD"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use uppercase with underscores for best practice
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Role Type</Label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the role's purpose and permissions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {isEditing ? "Update" : "Create"} Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Roles" value={stats.totalRoles || 0} icon={Shield} color="blue" delay={0} />
        <StatsCard title="System Roles" value={stats.systemRoles || 0} icon={Lock} color="purple" delay={0.1} />
        <StatsCard title="Custom Roles" value={stats.customRoles || 0} icon={Plus} color="green" delay={0.2} />
        <StatsCard title="Users with Roles" value={stats.totalUsersWithRoles || 0} icon={Users} color="amber" delay={0.3} />
        <StatsCard title="Avg Users/Role" value={stats.averageUsersPerRole || 0} icon={Users} color="cyan" delay={0.4} />
      </div>

      {/* Search */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Roles and Assignments Tabs */}
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="h-4 w-4 mr-2" />
            User Assignments
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoles.map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`relative ${role.isSystem ? "border-primary/30" : ""}`}>
                  {role.isSystem && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      System
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      {role.name}
                    </CardTitle>
                    <CardDescription className="text-sm truncate">
                      {role.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant={role.type === "SUPER_ADMIN" ? "default" : "outline"}>
                          {role.type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Users Assigned</span>
                        <span className="font-semibold">{role.userCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Permissions</span>
                        <span className="font-semibold">{role.permissionCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-xs">{new Date(role.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(role)}
                          disabled={role.isSystem && role.name === "SUPER_ADMIN"}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setRoleToDelete(role);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={role.isSystem}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Assign or remove roles from users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => {
                        const currentRole = user.roles[0] || { name: "N/A", type: "N/A" };
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold">
                                  {(user.name || user.email).charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{user.name || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{currentRole.type.replace("_", " ").toLowerCase()}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={currentRole.name}
                                defaultValue={currentRole.name}
                                onValueChange={(value) => {
                                  const selectedRole = roles.find(r => r.name === value);
                                  if (selectedRole) {
                                    assignRoleMutation.mutate({
                                      userId: user.id,
                                      roleId: selectedRole.id,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="rounded-md border border-input bg-background px-3 py-1 text-sm">
                                  <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent 
                                  defaultValue={currentRole.name}
                                  className="w-[200px] border border-input bg-background px-3 py-1 text-sm rounded-md"> 
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.name}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"?
              This action cannot be undone and may affect users assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && deleteMutation.mutate(roleToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}