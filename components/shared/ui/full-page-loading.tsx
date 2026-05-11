import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

// Full page loading component with progress
export function FullPageLoading() {
  
  const [mounted, setMounted] = useState(false);
  const {resolvedTheme} = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

   const logoSrc = mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-background to-background/80 z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-8"
      >
        {/* Animated logo */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 360],
          }}
          transition={{ 
            scale: { duration: 2, repeat: Infinity },
           // rotate: { duration: 10, repeat: Infinity, ease: "linear" }
          }}
          className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center"
        >
          {mounted && (
            <Image
              src={logoSrc}
              alt="Mvalex Business Suite"
              width={140}
              height={40}
              className="h-20  w-auto object-contain"
              priority
            />
          )}
        </motion.div>

        {/* Loading text with animated dots */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1">
            <span className="text-lg font-medium">Loading</span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            >.</motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            >.</motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            >.</motion.span>
          </div>
          <p className="text-sm text-muted-foreground">Preparing your workspace</p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-primary/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}