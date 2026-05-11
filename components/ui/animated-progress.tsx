// Custom animated progress component (optional)
// components/ui/animated-progress.tsx
"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps extends React.ComponentProps<typeof Progress> {
  value: number;
  duration?: number;
  showPercentage?: boolean;
}

export function AnimatedProgress({ 
  value, 
  duration = 1000, 
  showPercentage = false,
  className,
  ...props 
}: AnimatedProgressProps) {
  const [animatedValue, setAnimatedValue] = React.useState(0);

  React.useEffect(() => {
    const start = animatedValue;
    const end = value;
    const increment = (end - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setAnimatedValue(end);
        clearInterval(timer);
      } else {
        setAnimatedValue(current);
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <div className="relative">
      <Progress 
        value={animatedValue} 
        className={cn("transition-all", className)} 
        {...props} 
      />
      {showPercentage && (
        <span className="absolute right-0 top-0 -translate-y-full text-xs text-muted-foreground">
          {Math.round(animatedValue)}%
        </span>
      )}
    </div>
  );
}