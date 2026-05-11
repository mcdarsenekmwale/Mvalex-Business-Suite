// app/unauthorized/page.tsx (403 page)
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Home, HelpCircle, LogIn, AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 p-4">
      <Card className="max-w-md w-full shadow-xl border-amber-200 dark:border-amber-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Shield className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            Access Denied
          </CardTitle>
          <CardDescription className="text-base mt-2">
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  This area requires elevated permissions
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  If you believe this is an error, please contact your administrator or upgrade your account.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Required role: Admin or higher</p>
            <p className="text-xs mt-1">Your current role: User</p>
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
            <Link href="/auth/login">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/support">
              <HelpCircle className="h-4 w-4" />
              Contact Support
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}