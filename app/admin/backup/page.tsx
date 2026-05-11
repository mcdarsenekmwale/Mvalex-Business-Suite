// app/(admin)/backup/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { cn } from "@/lib/utils";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { SubmittingDialog } from "@/components/ui/submitting-dialog";

interface Backup {
  id: string;
  name: string;
  type: "full" | "database" | "files" | "configuration";
  size: number;
  status: "completed" | "failed" | "in_progress" | "pending" | 'missing';
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  createdByUser?: {
    name: string | null;
    email: string;
  };
  metadata?: {
    tables?: number;
    records?: number;
    compression?: string;
    checksum?: string;
  };
  downloadUrl?: string;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackupAt: string | null;
  averageBackupSize: number;
  successRate: number;
  storageUsed: number;
  storageLimit: number;
  databaseSize: number;
  filesSize: number;
}

const statusConfig = {
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400", icon: XCircle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400", icon: RefreshCw },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400", icon: Clock },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400", icon: AlertTriangle },
  missing: { label: "Missing", color: "bg-primary text-white ", icon: XCircle },
};

const typeConfig = {
  full: { label: "Full Backup", icon: Database, color: "text-purple-500" },
  database: { label: "Database Only", icon: Database, color: "text-blue-500" },
  files: { label: "Files Only", icon: HardDrive, color: "text-green-500" },
  configuration: { label: "Configuration", icon: Settings, color: "text-orange-500" },
};

export default function BackupManagementPage() {
  const queryClient = useQueryClient();
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backupType, setBackupType] = useState<"full" | "database" | "files" | "configuration">("full");
  const [createProgress, setCreateProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [backupStatus, setBackupStatus] = useState<"processing" | "success" | "error">("processing");
  const [backupMessage, setBackupMessage] = useState("Creating backup...");

  // Fetch backups
  const { data: backupsData, isLoading, refetch } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) throw new Error("Failed to fetch backups");
      return res.json();
    },
  });

  // Fetch backup stats
  const { data: statsData } = useQuery({
    queryKey: ["backup-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/backup/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed to create backup");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Backup created successfully!");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["backup-stats"] });
      setCreateDialogOpen(false);
      setIsCreating(false);
      setCreateProgress(0);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create backup");
      setIsCreating(false);
    },
  });

  // Download backup mutation
  const downloadBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      setIsSubmitting(true);
      simulateProgress();
      const res = await fetch(`/api/admin/backup/${backupId}/download`);
      if (!res.ok) throw new Error("Failed to download backup");
      return res.blob();
    },
    onSuccess: (blob, backupId) => {
      setIsSubmitting(false);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const backup = backups?.find(b => b.id === backupId);
      a.download = `${backup?.name || "backup"}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to download backup");
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      setIsSubmitting(true);
      setBackupStatus("processing");
      simulateProgress();
      const res = await fetch(`/api/admin/backup/${backupId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete backup");
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Backup deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["backup-stats"] });
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete backup");
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      setIsSubmitting(true);
      setBackupStatus("processing");
      simulateProgress();
      const res = await fetch(`/api/admin/backup/${backupId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore backup");
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Backup restored successfully!");
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore backup");
    },
  });

  const backups: Backup[] = backupsData?.backups || [];
  const stats: BackupStats = statsData?.stats || {
    totalBackups: 0,
    totalSize: 0,
    lastBackupAt: null,
    averageBackupSize: 0,
    successRate: 0,
    storageUsed: 0,
    storageLimit: 10737418240, // 10GB default
    databaseSize: 0,
    filesSize: 0,
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStoragePercentage = () => {
    return (stats.storageUsed / stats.storageLimit) * 100;
  };

  //Simulate progress
  const simulateProgress = () =>{
    const interval = setInterval(() => {
      setCreateProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);
  }

  // Create backup mutation
  const handleCreateBackup = () => {
    setIsCreating(true);
    setCreateProgress(0);
    
    // Simulate progress
    simulateProgress();
    createBackupMutation.mutate(backupType);
  };

  //Loading state for backups
  if (isLoading && backups.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Backup Management" subtitle="Manage database and file backups" />
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
        title="Backup Management"
        subtitle="Create, download, and restore system backups"
        action={
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-primary text-white">
            <Database className="h-4 w-4" />
            Create Backup
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Backups"
          value={stats.totalBackups}
          icon={Database}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Total Size"
          value={formatFileSize(stats.totalSize)}
          icon={HardDrive}
          color="purple"
          delay={0.1}
        />
        <StatsCard
          title="Last Backup"
          value={stats.lastBackupAt ? formatDistanceToNow(new Date(stats.lastBackupAt), { addSuffix: true }) : "Never"}
          valueClassName="text-slate-900 dark:text-slate-100 text-2xl capitalize font-medium" 
          icon={Clock}
          color="green"
          delay={0.2}
        />
        <StatsCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={CheckCircle2}
          color="emerald"
          delay={0.3}
        />
      </div>

      {/* Storage Usage Card */}
      <Card className="shadow-md rounded-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            {formatFileSize(stats.storageUsed)} of {formatFileSize(stats.storageLimit)} used
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={getStoragePercentage()} className="h-2" />
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Database Size:</span>
              <span className="ml-2 font-medium">{formatFileSize(stats.databaseSize)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Files Size:</span>
              <span className="ml-2 font-medium">{formatFileSize(stats.filesSize)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups Table */}
      <Card className="shadow-md rounded-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>List of all system backups</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold uppercase">Name</TableHead>
                <TableHead className="font-semibold uppercase">Type</TableHead>
                <TableHead className="font-semibold uppercase">Size</TableHead>
                <TableHead className="font-semibold uppercase">Status</TableHead>
                <TableHead className="font-semibold uppercase">Created</TableHead>
                <TableHead className="font-semibold uppercase">Created By</TableHead>
                <TableHead className="text-right font-semibold uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No backups found. Create your first backup to get started.
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((backup, index) => {
                  const StatusIcon = statusConfig[backup.status.toLowerCase() as keyof typeof statusConfig]?.icon || statusConfig[backup.status]?.icon || RefreshCw;
                  const TypeIcon = typeConfig[backup.type]?.icon || Database;
                  const state = backup.status.toLowerCase() !== "completed";
                  
                  return (
                    <TableRow key={backup.id + index} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={cn("h-4 w-4", typeConfig[backup.type]?.color)} />
                          <span>{typeConfig[backup.type]?.label || backup.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(backup.size)}</TableCell>
                      <TableCell>
                        <Badge className={cn(statusConfig[backup.status.toLowerCase() as keyof typeof statusConfig]?.color, 'dark:text-slate-100 capitalize')}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[backup.status.toLowerCase() as keyof typeof statusConfig]?.label || backup.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(backup.createdAt), "MMM d, yyyy")}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(backup.createdAt), "h:mm a")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {backup.createdByUser?.name || backup.createdByUser?.email || backup.createdBy}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            className="hover:text-green-600 cursor-pointer transition-colors"
                            size="icon"
                            onClick={() => downloadBackupMutation.mutate(backup.id)}
                            disabled={state}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className=" hover:text-primary cursor-pointer transition-colors "
                            size="icon"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialogOpen(true);
                            }}
                            disabled={state}
                            title="Restore"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive cursor-pointer transition-colors"
                            size="icon"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Backup</DialogTitle>
            <DialogDescription>
              Choose the type of backup you want to create
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setBackupType("full")}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  backupType === "full"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Database className="h-6 w-6 text-purple-500 mb-2" />
                <p className="font-medium">Full Backup</p>
                <p className="text-xs text-muted-foreground">Database + Files + Configuration</p>
              </button>
              <button
                onClick={() => setBackupType("database")}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  backupType === "database"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Database className="h-6 w-6 text-blue-500 mb-2" />
                <p className="font-medium">Database Only</p>
                <p className="text-xs text-muted-foreground">PostgreSQL database dump</p>
              </button>
              <button
                onClick={() => setBackupType("files")}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  backupType === "files"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <HardDrive className="h-6 w-6 text-green-500 mb-2" />
                <p className="font-medium">Files Only</p>
                <p className="text-xs text-muted-foreground">Uploaded files and assets</p>
              </button>
              <button
                onClick={() => setBackupType("configuration")}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  backupType === "configuration"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Settings className="h-6 w-6 text-orange-500 mb-2" />
                <p className="font-medium">Configuration</p>
                <p className="text-xs text-muted-foreground">System settings and templates</p>
              </button>
            </div>

            {isCreating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Creating backup...</span>
                  <span>{createProgress}%</span>
                </div>
                <Progress value={createProgress} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBackup} disabled={isCreating} className="bg-primary text-white">
              {isCreating ? "Creating..." : "Create Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Restore Backup
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this backup? This will overwrite current data.
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm font-medium">Backup: {selectedBackup?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created on {selectedBackup && format(new Date(selectedBackup.createdAt), "PPP")}
                </p>
              </div>
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                Warning: This action cannot be undone. Current data will be overwritten.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && restoreBackupMutation.mutate(selectedBackup.id)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedBackup?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Size: {formatFileSize(selectedBackup?.size || 0)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && deleteBackupMutation.mutate(selectedBackup.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submitting dialog and progress */}
      <SubmittingDialog
        open={isSubmitting}
        onOpenChange={setIsSubmitting}
        progress={createProgress}
        status={backupStatus}
        message={backupMessage}
        type={backupType}
      />
    </div>
  );
}