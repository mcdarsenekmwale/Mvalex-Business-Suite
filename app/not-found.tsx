// app/not-found.tsx (404 page)
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, HelpCircle, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <FileQuestion className="h-12 w-12 text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              404
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Page Not Found</CardTitle>
          <CardDescription className="text-base mt-2">
            Oops! The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              You might want to check the URL or navigate to one of the following sections:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { name: "Business Cards", href: "/business-cards" },
                { name: "Invoices", href: "/invoices" },
                { name: "Logos", href: "/logos" },
                { name: "Analytics", href: "/dashboard" },
                ].map((item: any, index: number) => (
                <Link key={item.href + index} href={item.href}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>
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
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/support">
              <HelpCircle className="h-4 w-4" />
              Support
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}