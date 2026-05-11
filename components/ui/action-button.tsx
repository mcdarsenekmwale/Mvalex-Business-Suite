"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "./permission-guard";
import { Permission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { Plus, Edit, Trash2, Download } from "lucide-react";

interface ActionButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  permission?: Permission | Permission[];
  requiredRole?: string | string[];
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  tooltipMessage?: string;
}

export function ActionButton({
  children,
  onClick,
  href,
  permission,
  requiredRole,
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  className,
  tooltipMessage = "You don't have permission to perform this action",
}: ActionButtonProps) {
  const button = (
    <Button
      onClick={onClick}
      asChild={!!href}
      variant={variant as any}
      size={size as any}
      disabled={disabled || loading}
      className={cn(className)}
    >
      {href ? <Link href={href as string}>{children}</Link> : children}
    </Button>
  );

  if (permission || requiredRole) {
    return (
      <PermissionGuard
        permissions={permission as any}
        roles={requiredRole as any}
        disableOnMissing
        showTooltip
        tooltipMessage={tooltipMessage}
      >
        {button}
      </PermissionGuard>
    );
  }

  return button;
}

export function CreateButton({
  permission = "users:create",
  href = "/admin/users/create",
  label = "Create",
  ...props
}: ActionButtonProps & { label?: string }) {
  return (
    <ActionButton permission={permission as any} href={href} {...props}>
      <Plus className="h-4 w-4 mr-2" />
      {label}
    </ActionButton>
  );
}

export function EditButton({ permission = "users:edit", onClick, href, ...props }: ActionButtonProps) {
  return (
    <ActionButton permission={permission as any} onClick={onClick} href={href} variant="outline" size="sm" {...props}>
      <Edit className="h-4 w-4 mr-1" />
      Edit
    </ActionButton>
  );
}

export function DeleteButton({ permission = "users:delete", onClick, ...props }: ActionButtonProps) {
  return (
    <ActionButton permission={permission as any} onClick={onClick} variant="destructive" size="sm" {...props}>
      <Trash2 className="h-4 w-4 mr-1" />
      Delete
    </ActionButton>
  );
}

export function ExportButton({ permission = "exports:create", onClick, ...props }: ActionButtonProps) {
  return (
    <ActionButton permission={permission as any} onClick={onClick} variant="outline" size="sm" {...props}>
      <Download className="h-4 w-4 mr-2" />
      Export
    </ActionButton>
  );
}
