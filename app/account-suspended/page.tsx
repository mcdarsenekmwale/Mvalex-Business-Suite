// app/account-suspended/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Home, HelpCircle } from "lucide-react";

export default function AccountSuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 p-4">
      <Card className="max-w-md w-full shadow-xl border-red-200 dark:border-red-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Shield className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
            Account Suspended
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your account has been temporarily suspended
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Your account has been suspended due to violation of our terms of service.
              Please contact support for more information.
            </p>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>If you believe this is a mistake, please reach out to our support team.</p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/api/auth/signout">
              <Home className="h-4 w-4" />
              Sign Out
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
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