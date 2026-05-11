// components/ui/loading.tsx
"use client";

import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "spinner" | "pulse" | "bounce" | "dots" | "wave" | "progress";
  text?: string;
  fullScreen?: boolean;
  className?: string;
  textClassName?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const spinnerVariants: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: "linear" } },
};

const pulseVariants: Variants = {
  initial: { scale: 0.8, opacity: 0.5 },
  animate: { 
    scale: [0.8, 1, 0.8],
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
  },
};

const bounceVariants: Variants = {
  initial: { y: 0 },
  animate: { 
    y: [0, -20, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
  },
};

const dotsVariants: Variants = {
  initial: { scale: 0 },
  animate: { 
    scale: [0, 1, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
  },
};

const waveVariants: Variants = {
  initial: { y: 0 },
  animate: (i: number) => ({ 
    y: [0, -15, 0],
    transition: { 
      duration: 0.6, 
      repeat: Infinity, 
      delay: i * 0.1,
      ease: "easeInOut" 
    }
  }),
};

export function Loading({ 
  size = "md", 
  variant = "spinner", 
  text, 
  fullScreen = false,
  className,
  textClassName 
}: LoadingProps) {
  const renderLoader = () => {
    switch (variant) {
      case "spinner":
        return (
          <motion.div
            variants={spinnerVariants}
            initial="initial"
            animate="animate"
            className={cn(
              "rounded-full border-4 border-primary/20 border-t-primary",
              sizeClasses[size]
            )}
          />
        );

      case "pulse":
        return (
          <motion.div
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            className={cn(
              "rounded-full bg-primary",
              sizeClasses[size]
            )}
          />
        );

      case "bounce":
        return (
          <motion.div
            variants={bounceVariants}
            initial="initial"
            animate="animate"
            className={cn(
              "rounded-full bg-primary",
              sizeClasses[size]
            )}
          />
        );

      case "dots":
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                variants={dotsVariants}
                initial="initial"
                animate="animate"
                custom={i}
                className={cn(
                  "rounded-full bg-primary",
                  size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-5 h-5"
                )}
              />
            ))}
          </div>
        );

      case "wave":
        return (
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                custom={i}
                variants={waveVariants}
                initial="initial"
                animate="animate"
                className={cn(
                  "rounded-full bg-primary",
                  size === "sm" ? "w-1 h-4" : size === "md" ? "w-1.5 h-6" : size === "lg" ? "w-2 h-8" : "w-2.5 h-10"
                )}
              />
            ))}
          </div>
        );

      case "progress":
        return (
          <div className="w-48 h-1 bg-primary/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        );

      default:
        return (
          <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        );
    }
  };

  const content = (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
        className
      )}
    >
      {renderLoader()}
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn("text-sm text-muted-foreground", textClassName)}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );

  return content;
}



// Page loading component
export function PageLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="text-center space-y-6">
        <Loading size="lg" variant="wave" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">Loading...</p>
          <p className="text-sm text-muted-foreground">Please wait while we prepare your content</p>
        </div>
      </div>
    </div>
  );
}
