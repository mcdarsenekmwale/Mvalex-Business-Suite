// components/ui/popover-enhanced.tsx (Enhanced version with more features)
"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopoverEnhancedProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  title?: string;
  description?: string;
  showClose?: boolean;
  onClose?: () => void;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "w-64",
  md: "w-80",
  lg: "w-96",
  xl: "w-[32rem]",
  full: "w-screen max-w-[calc(100vw-2rem)]",
};

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverEnhancedProps
>(({ 
  className, 
  align = "center", 
  sideOffset = 4,
  title,
  description,
  showClose = false,
  onClose,
  footer,
  size = "md",
  children,
  ...props 
}, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-lg border bg-popover shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {(title || showClose) && (
        <div className={cn(
          "flex items-center justify-between",
          title && "border-b pb-3 mb-3",
          !title && showClose && "justify-end"
        )}>
          {title && (
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          )}
          {showClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      <div className={cn(footer && "mb-3")}>{children}</div>
      {footer && (
        <div className="border-t pt-3 mt-3">
          {footer}
        </div>
      )}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };