// components/admin/layout/NavItemRenderer.tsx
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useMemo } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  badgeColor?: string;
  children?: NavItem[];
   requiredPermissions?: string[];
}

// Helper component for nav items with children
interface NavItemRendererProps {
  item: NavItem;
  pathname: string;
  isMobile: boolean;
  onClose: () => void;
  level?: number;
}

function NavItemRenderer({ item, pathname, isMobile, onClose, level = 0 }: NavItemRendererProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  
  // Check if current item is active
  const isActive = useMemo(() => {
    return pathname === item.href || pathname?.startsWith(item.href + "/");
  }, [pathname, item.href]);
  
  // Check if any child is active (for parent items)
  const isChildActive = useMemo(() => {
    if (!hasChildren) return false;
    return item.children?.some(child => 
      pathname === child.href || pathname?.startsWith(child.href + "/")
    ) || false;
  }, [pathname, hasChildren, item.children]);
  
  // Auto-expand if a child is active
  useEffect(() => {
    if (hasChildren && isChildActive) {
      setIsOpen(true);
    }
  }, [hasChildren, isChildActive]);

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
              (isActive || isChildActive || isOpen)
                ? "bg-primary/20 text-primary"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className={cn("h-5 w-5", (isActive || isChildActive || isOpen) && "text-primary")} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge className={cn("text-xs font-medium", item.badgeColor || "bg-primary/20 text-primary")}>
                {item.badge}
              </Badge>
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-200" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-6 mt-1 space-y-1">
          {item.children?.map((child) => (
            <NavItemRenderer
              key={child.href}
              item={child}
              pathname={pathname}
              isMobile={isMobile}
              onClose={onClose}
              level={level + 1}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  // Calculate if this leaf item is active
  const isLeafActive = pathname === item.href || pathname?.startsWith(item.href + "/");
  
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          onClick={() => {
            if (isMobile) onClose();
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
            isLeafActive
              ? "bg-primary/20 text-primary shadow-sm"
              : "text-white/70 hover:bg-white/10 hover:text-white",
            level > 0 && "pl-8"
          )}
        >
          <item.icon className={cn("h-4 w-4", isLeafActive && "text-primary")} />
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge className={cn("text-xs font-medium", item.badgeColor || "bg-primary/20 text-primary")}>
              {item.badge}
            </Badge>
          )}
          {isLeafActive && (
            <div className="absolute left-0 w-1 h-6 bg-primary rounded-full" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={0}>
        <p>{item.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default NavItemRenderer;