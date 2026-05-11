// components/ui/loading.tsx
"use client";

import { Loading } from "./loading";
import { motion } from "framer-motion";

// Loading overlay component
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
}

export function LoadingOverlay({ isLoading, children, text }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <Loading variant="spinner" text={text || "Loading..."} />
        </div>
      )}
    </div>
  );
}




// Button loading state component
export function ButtonLoading() {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
      />
    </div>
  );
}


