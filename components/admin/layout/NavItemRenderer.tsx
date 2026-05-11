"use client";

import React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Permission, UserRole } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  permissions?: Permission[];
  roles?: UserRole[];
  children?: NavItem[];
  badge?: string;
}

export default function NavItemRenderer({ item }: { item: NavItem }) {
  if (!item) return null;
  return (
    <div className="py-1">
      <Link href={item.href} className={cn("flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent") }>
        <item.icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{item.label}</span>
        {item.children && item.children.length > 0 && <ChevronDown className="h-4 w-4" />}
      </Link>
      {item.children && item.children.length > 0 && (
        <div className="pl-8 mt-1 space-y-1">
          {item.children.map(child => (
            <Link key={child.href} href={child.href} className="flex items-center gap-2 px-3 py-1 rounded-md text-sm hover:bg-accent">
              <child.icon className="h-4 w-4 text-muted-foreground" />
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
