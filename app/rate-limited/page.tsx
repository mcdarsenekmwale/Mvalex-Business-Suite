// app/rate-limited/page.tsx (429 Too Many Requests)
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, Home, HelpCircle, Clock } from "lucide-react";

export default function RateLimitedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/10 p-4">
      <Card className="max-w-md w-full shadow-xl border-orange-200 dark:border-orange-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Timer className="h-10 w-10 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            Too Many Requests
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Please slow down and try again later
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Rate limit exceeded
              </p>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              You've made too many requests in a short period. Please wait a few minutes before trying again.
            </p>
          </div>
          <div className="text-center text-xs text-muted-foreground">
            <p>Tips to avoid rate limiting:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Space out your API requests</li>
              <li>Use caching when possible</li>
              <li>Upgrade your plan for higher limits</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/support">
              <HelpCircle className="h-4 w-4" />
              Need Help?
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}