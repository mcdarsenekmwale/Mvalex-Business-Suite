// app/global-error.tsx (Root-level error boundary for the entire app)
"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-950">
          <div className="text-center space-y-6 p-8 max-w-md">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-red-600">500</h1>
              <h2 className="text-2xl font-semibold">Critical Error</h2>
              <p className="text-muted-foreground">
                The application encountered a critical error. Our team has been notified.
              </p>
            </div>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={reset}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try again
              </Button>
              <Button 
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}