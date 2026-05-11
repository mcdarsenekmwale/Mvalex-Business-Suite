// app/offline/page.tsx (Offline/Network error page)
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, Home, RefreshCw, Signal } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/health/status", { method: "HEAD" });
      if (response.ok) {
        setIsOnline(true);
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Still offline:", error);
    } finally {
      setChecking(false);
    }
  };

  if (isOnline) {
    // Redirect to home if back online
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-gray-600 dark:text-gray-400" />
          </div>
          <CardTitle className="text-3xl font-bold">No Internet Connection</CardTitle>
          <CardDescription className="text-base mt-2">
            You appear to be offline. Please check your network connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Signal className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Once you're back online, we'll automatically redirect you to the home page.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3 justify-center">
          <Button onClick={checkConnection} disabled={checking} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? "Checking..." : "Check Connection"}
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Try Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}