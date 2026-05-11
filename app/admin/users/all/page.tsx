// app/(admin)/users/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  Coins,
  Shield,
  Headset,
  RefreshCcw,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingShimmer } from "@/components/shared/ui/loading-shimmer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Role, Permission, statusOptions } from "@/lib/types/users";
import UserTableContent from "@/components/admin/users/UserTableContent";
import { EditUserSheet } from "@/components/admin/users/EditUserSheet";
import { CreateUserSheet } from "@/components/admin/users/CreateUserSheet";
import { ActionButton, CreateButton } from "@/components/ui/action-button";


export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("regular");


  // Fetch users
  const { data, isLoading, refetch: refreshUsers } = useQuery({
    queryKey: ["admin-users", search, status, page, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "50");
      params.set("userType", activeTab === "admin" ? "admin" : "regular");
      
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch roles for dropdown
  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  // Fetch permissions for role assignment
  const { data: permissionsData } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/permissions");
      if (!res.ok) throw new Error("Failed to fetch permissions");
      return res.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully!");
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated successfully!");
      setDialogOpen(false);
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to process bulk action");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUsers(new Set());
      toast.success("Bulk action completed!");
    },
  });

  const users: User[] = data?.users || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const roles: Role[] = rolesData?.roles || [];
  const permissions: Permission[] = permissionsData?.permissions || [];

  const getRoleIcon = (role: string) => {
    if (role === "SUPER_ADMIN") return <Crown className="h-3.5 w-3.5 text-amber-500" />;
    if (role === "ADMIN") return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    if (role === "SUPPORT_AGENT") return <Headset className="h-3.5 w-3.5 text-green-500" />;
    return <UserCheck className="h-3.5 w-3.5 text-blue-500" />;
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setSelectedUsers(newSet);
  };

  // Export users to CSV
  const exportToCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Credits", "Joined"];
    const rows = users.map((u) => [
      u.name || "N/A",
      u.email,
      u.roles?.[0]?.name || u.roles?.[0]?.type || "USER",
      u.status,
      String(u.creditsBalance || 0),
      new Date(u.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Users exported to CSV");
  };

  // Handle user creation
  const handleCreateUser = (newUser: any) => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email and password are required");
      return;
    }
    createUserMutation.mutate(newUser);
  };

  // Filter users by role
  const filterUsers = (u: any) =>
    u.roles?.some((r: { name: string; type: string }) => ( ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT", "SUPPORT_MANAGER"].includes(r.name) || r.type === "ADMIN"));

  // Refresh users
  if (isLoading) return <LoadingShimmer />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users, roles, permissions, and credits"
        action={
          <div className="flex gap-2">
            <Button 
              
              variant="outline" 
              size="sm" className="gap-1.5" 
              onClick={() => refreshUsers()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            {/* Export button - only shows if user has export permission */}
            <ActionButton 
              permission="exports:create"
              variant="outline"
              size="sm"
              href="#"
              className="gap-1.5" 
              onClick={(e)=>{
                e.stopPropagation();
                e.preventDefault();
                exportToCSV()
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </ActionButton>
             {/* Create button - only shows for users with create permission */}
              <CreateButton 
                permission="users:create"
                size="sm"
                href="#"
                
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setCreateDialogOpen(true);
                }}
                className="gap-1.5 bg-primary text-white"
                label="Add User"
              />
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={pagination.total} icon={Users} color="blue" delay={0} />
        <StatsCard title="Active" value={users.filter((u) => u.status === "ACTIVE").length} icon={UserCheck} color="green" delay={0.1} />
        <StatsCard title="Suspended" value={users.filter((u) => u.status === "SUSPENDED").length} icon={UserX} color="rose" delay={0.2} />
        <StatsCard title="Total Credits" value={users.reduce((a, u) => a + (u.creditsBalance || 0), 0)} icon={Coins} color="amber" delay={0.3} />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select
              value={status}
              onValueChange={(value) => { setStatus(value); setPage(1); }}
            >
              <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* User Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Regular Users
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin & Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular">
          <UserTableContent
            users={users.filter(u => !filterUsers(u))}
            selectedUsers={selectedUsers}
            toggleUserSelection={toggleUserSelection}
            setSelectedUsers={setSelectedUsers}
            getRoleIcon={getRoleIcon}
            setSelectedUser={setSelectedUser}
            setDialogOpen={setDialogOpen}
            bulkActionMutation={bulkActionMutation}
          />
        </TabsContent>

        <TabsContent value="admin">
          <UserTableContent
            users={users.filter(u => filterUsers(u))}
            selectedUsers={selectedUsers}
            toggleUserSelection={toggleUserSelection}
            setSelectedUsers={setSelectedUsers}
            getRoleIcon={getRoleIcon}
            setSelectedUser={setSelectedUser}
            setDialogOpen={setDialogOpen}
            bulkActionMutation={bulkActionMutation}
            showAdminBadge
          />
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {users.length} of {pagination.total} users</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">Page {page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    {/* // Replace the Edit User Dialog with: */}
    <EditUserSheet
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      user={selectedUser}
      roles={roles}
      onSave={(data) => {
        updateUserMutation.mutate({
          userId: data.userId,
          name: data.name,
          status: data.status,
          roleId: data.roleId,
          credits: data.creditsBalance,
        });
      }}
      isSaving={updateUserMutation.isPending}
      getRoleIcon={getRoleIcon}
    />

    {/* // Replace the Create User Dialog with: */}
    <CreateUserSheet
      open={createDialogOpen}
      onOpenChange={setCreateDialogOpen}
      roles={roles}
      onCreate={handleCreateUser}
      isCreating={createUserMutation.isPending}
      getRoleIcon={getRoleIcon}
    />
    </div>
  );
}



