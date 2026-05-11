// app/error.tsx (Global error boundary)
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw, Mail, Bug } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
    
    // You can add custom error logging here
    // Example: send to Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === "production") {
      // Send to your error tracking service
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 p-4">
          <Card className="max-w-md w-full shadow-xl border-red-200 dark:border-red-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Bug className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
                Something Went Wrong!
              </CardTitle>
              <CardDescription className="text-base mt-2">
                A critical error occurred in the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">
                  {error.message || "An unexpected error occurred"}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p>Our team has been notified. Please try again or contact support if the problem persists.</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 justify-center">
              <Button onClick={reset} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = "/"} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  );
}