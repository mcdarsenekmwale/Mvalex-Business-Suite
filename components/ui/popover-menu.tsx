// components/ui/popover-menu.tsx (Menu-style popover)
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface PopoverMenuItem {
  label: string;
  value: string;
  icon?: React.ElementType;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
}

interface PopoverMenuProps {
  trigger: React.ReactNode;
  items: PopoverMenuItem[];
  onSelect?: (value: string) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function PopoverMenu({ 
  trigger, 
  items, 
  onSelect, 
  align = "end", 
  side = "bottom",
  className 
}: PopoverMenuProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    onSelect?.(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent 
        className={cn("w-56 p-1", className)} 
        align={align} 
        side={side}
      >
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                onClick={() => !item.disabled && handleSelect(item.value)}
                disabled={item.disabled}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  item.danger && "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                )}
              >
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <kbd className="text-xs text-muted-foreground">{item.shortcut}</kbd>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}