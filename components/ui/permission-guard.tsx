"use client";

import React, { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { Permission, UserRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionGuardProps {
  children: ReactNode | ((props: { disabled: boolean }) => ReactNode);
  permissions?: Permission | Permission[];
  roles?: UserRole | UserRole[];
  fallback?: ReactNode;
  disableOnMissing?: boolean;
  showTooltip?: boolean;
  tooltipMessage?: string;
  className?: string;
}

export function PermissionGuard({
  children,
  permissions,
  roles,
  fallback = null,
  disableOnMissing = false,
  showTooltip = false,
  tooltipMessage = "You don't have permission to perform this action",
  className,
}: PermissionGuardProps) {
  const { hasPermission, hasRole } = usePermissions();

  let hasAccess = true;

  if (roles) {
    hasAccess = hasAccess && hasRole(roles as any);
  }

  if (permissions) {
    if (Array.isArray(permissions)) {
      hasAccess = hasAccess && permissions.some(p => hasPermission(p));
    } else {
      hasAccess = hasAccess && hasPermission(permissions);
    }
  }

  if (!hasAccess) {
    if (disableOnMissing) {
      const child = typeof children === "function" ? children({ disabled: true }) : children;
      if (showTooltip) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("cursor-not-allowed opacity-60", className)}>{child}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltipMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <div className={cn("cursor-not-allowed opacity-60", className)}>{child}</div>;
    }
    return <>{fallback}</>;
  }

  if (typeof children === "function") {
    return <>{children({ disabled: false })}</>;
  }

  return <>{children}</>;
}

export function Show({ children, when, fallback = null }: { children: ReactNode; when: boolean; fallback?: ReactNode }) {
  return when ? <>{children}</> : <>{fallback}</>;
}

export function RoleGuard({ children, roles, fallback = null }: { children: ReactNode; roles?: UserRole | UserRole[]; fallback?: ReactNode }) {
  const { hasRole } = usePermissions();
  const hasAccess = roles ? hasRole(roles as any) : false;
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
