"use client";

import { JSX } from "react";
import {
  MoreHorizontal,
  UserCheck,
  UserX,
  Coins,
  Mail,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";
import { TableCell, TableHead, TableBody, TableRow, Table, TableHeader } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { useSession } from "next-auth/react";

// Table Component
interface UserTableContentProps {
  users: User[];
  selectedUsers: Set<string>;
  toggleUserSelection: (userId: string) => void;
  setSelectedUsers: (users: Set<string>) => void;
  getRoleIcon: (role: string) => JSX.Element;
  setSelectedUser: (user: User) => void;
  setDialogOpen: (open: boolean) => void;
  bulkActionMutation: any;
  showAdminBadge?: boolean;
}

export default function UserTableContent({
  users,
  selectedUsers,
  toggleUserSelection,
  setSelectedUsers,
  getRoleIcon,
  setSelectedUser,
  setDialogOpen,
  bulkActionMutation,
  showAdminBadge = false,
}: UserTableContentProps) {

  const { data } = useSession();
  const currentUser = data?.user;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-md border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden"
    >
      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border-b">
          <span className="text-sm font-medium">{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          <Button size="sm" variant="outline" onClick={() => bulkActionMutation.mutate({ userIds: Array.from(selectedUsers), action: "suspend" })}>
            <UserX className="h-3.5 w-3.5 mr-1" /> Suspend
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkActionMutation.mutate({ userIds: Array.from(selectedUsers), action: "activate" })}>
            <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkActionMutation.mutate({ userIds: Array.from(selectedUsers), action: "add_credits", creditsAmount: 100 })}>
            <Coins className="h-3.5 w-3.5 mr-1" /> +100 Credits
          </Button>
          <Button size="sm" variant="destructive" onClick={() => {
            if (confirm(`Delete ${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''}?`)) {
              bulkActionMutation.mutate({ userIds: Array.from(selectedUsers), action: "delete" });
            }
          }}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedUsers(new Set())}>
            Cancel
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
              <TableHead className="w-10 px-4 py-3">
                <Checkbox
                  className="rounded border-slate-300"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedUsers(new Set(users.map((u) => u.id)));
                    else setSelectedUsers(new Set());
                  }}
                />
              </TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">User</TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider">Credits</TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Assets</TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
              <TableHead className="w-10 px-4 py-3"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={cn(
                  "border-b border-slate-50 dark:border-slate-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors",
                  {
                    "bg-slate-50/50 dark:bg-slate-800/30": user.emailVerified,
                  },
                  "cursor-pointer"
                )}>
                  <TableCell className="px-4 py-3">
                    <Checkbox
                      className="rounded border-slate-300"
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{user.name || "N/A"}</p>
                          {showAdminBadge && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                      {getRoleIcon(user.roles?.[0]?.type || "USER")}
                      {user.roles?.[0]?.name || "User"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={user.status} size="sm" />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <span className="text-sm font-medium">{user.creditsBalance || 0}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {user._count?.businessCards || 0} cards · {user._count?.invoices || 0} inv · {user._count?.logos || 0} logos
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        
                        <DropdownMenuItem disabled={!hasPermission((currentUser?.roleSubtype || currentUser?.role) as any, PERMISSIONS.ADMIN.EDIT_USERS)} 
                        onClick={() => { setSelectedUser(user); setDialogOpen(true); }}>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(user.id); toast.success("Copied"); }}>
                          <Key className="h-4 w-4 mr-2" />
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          disabled={!hasPermission((currentUser?.roleSubtype || currentUser?.role) as any, PERMISSIONS.ADMIN.DELETE_USERS)}
                          className="text-destructive" onClick={() => {
                            if (confirm(`Delete user ${user.name || user.email}?`)) {
                              bulkActionMutation.mutate({ userIds: [user.id], action: "delete" });
                            }
                          }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}

// Helper icon component
const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);