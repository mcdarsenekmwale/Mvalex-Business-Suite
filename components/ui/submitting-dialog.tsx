// components/ui/submitting-dialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Database, HardDrive, Settings, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmittingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  status?: "processing" | "success" | "error";
  message?: string;
  type?: "full" | "database" | "files" | "configuration";
}

const typeIcons = {
  full: Database,
  database: Database,
  files: HardDrive,
  configuration: Settings,
};

const typeLabels = {
  full: "Full Backup",
  database: "Database Backup",
  files: "Files Backup",
  configuration: "Configuration Backup",
};

export function SubmittingDialog({
  open,
  onOpenChange,
  progress,
  status = "processing",
  message = "Creating backup...",
  type = "full",
}: SubmittingDialogProps) {
  const Icon = typeIcons[type];
  const StatusIcon = status === "processing" ? Loader2 : status === "success" ? CheckCircle2 : XCircle;
  const isComplete = status === "success" || status === "error";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shadow-xl rounded-lg overflow-hidden p-0 gap-0">
        {/* Progress Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              status === "processing" && "bg-primary/10",
              status === "success" && "bg-green-100 dark:bg-green-950/30",
              status === "error" && "bg-red-100 dark:bg-red-950/30"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                status === "processing" && "text-primary",
                status === "success" && "text-green-600 dark:text-green-400",
                status === "error" && "text-red-600 dark:text-red-400"
              )} />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {typeLabels[type]}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress 
              value={progress} 
              className={cn(
                "h-2 transition-all duration-300",
                status === "success" && "[&>div]:bg-green-500",
                status === "error" && "[&>div]:bg-red-500"
              )}
            />
          </div>

          {/* Status Messages */}
          <div className="space-y-2 text-sm">
            {progress < 30 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Initializing backup process...</span>
              </div>
            )}
            {progress >= 30 && progress < 60 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Gathering data and files...</span>
              </div>
            )}
            {progress >= 60 && progress < 90 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Compressing backup archive...</span>
              </div>
            )}
            {progress >= 90 && status === "processing" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Finalizing and saving...</span>
              </div>
            )}
          </div>

          {/* Status Icon */}
          <div className="flex justify-center pt-4">
            <StatusIcon className={cn(
              "h-8 w-8 animate-spin",
              status === "processing" && "text-primary",
              status === "success" && "text-green-500 animate-none",
              status === "error" && "text-red-500 animate-none"
            )} />
          </div>
        </div>

        {/* Auto-close countdown (success only) */}
        {status === "success" && (
          <div className="px-6 pb-6">
            <p className="text-xs text-center text-muted-foreground">
              This window will close automatically in 3 seconds...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}