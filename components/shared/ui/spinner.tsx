"use client";

import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Spinner Component with enhanced features
interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "circular" | "dots" | "ripple" | "gradient";
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "white";
  thickness?: "thin" | "medium" | "thick";
  label?: string;
  className?: string;
}

const spinnerSizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const spinnerThicknessClasses = {
  thin: "border-2",
  medium: "border-4",
  thick: "border-[6px]",
};

const spinnerColorClasses = {
  primary: "border-primary/20 border-t-primary",
  secondary: "border-secondary/20 border-t-secondary",
  success: "border-green-500/20 border-t-green-500",
  warning: "border-yellow-500/20 border-t-yellow-500",
  danger: "border-red-500/20 border-t-red-500",
  white: "border-white/20 border-t-white",
};

const rippleVariants: Variants = {
  initial: { scale: 0, opacity: 0.8 },
  animate: { 
    scale: [0, 1.5, 2],
    opacity: [0.8, 0.4, 0],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeOut" }
  },
};

const gradientSpinVariants: Variants = {
  animate: { 
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  },
};

export function Spinner({ 
  size = "md", 
  variant = "circular", 
  color = "primary",
  thickness = "medium",
  label,
  className 
}: SpinnerProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ 
              scale: [0.5, 1.2, 0.5],
              opacity: [0.5, 1, 0.5],
              transition: { 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2,
                ease: "easeInOut"
              }
            }}
            className={cn(
              "rounded-full bg-current",
              spinnerSizeClasses[size]
            )}
          />
        ))}
        {label && <span className="ml-2 text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }

  if (variant === "ripple") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        <motion.div
          variants={rippleVariants}
          initial="initial"
          animate="animate"
          className={cn(
            "absolute rounded-full bg-primary",
            spinnerSizeClasses[size]
          )}
        />
        <motion.div
          variants={rippleVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.75 }}
          className={cn(
            "absolute rounded-full bg-primary",
            spinnerSizeClasses[size]
          )}
        />
        <div className={cn("rounded-full bg-primary/20", spinnerSizeClasses[size])} />
        {label && <span className="ml-2 text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }

  if (variant === "gradient") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <motion.div
          variants={gradientSpinVariants}
          animate="animate"
          className={cn(
            "rounded-full bg-gradient-to-r from-primary via-primary/60 to-transparent",
            spinnerSizeClasses[size]
          )}
        />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }

  // Default circular spinner
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className={cn(
          "rounded-full",
          spinnerSizeClasses[size],
          spinnerThicknessClasses[thickness],
          spinnerColorClasses[color]
        )}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
