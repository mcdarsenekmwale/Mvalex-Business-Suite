// app/maintenance/page.tsx (Maintenance page)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Clock, Mail, Twitter } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  const estimatedTime = process.env.NEXT_PUBLIC_MAINTENANCE_ESTIMATED_TIME || "2 hours";
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 p-4">
      <Card className="max-w-md w-full shadow-xl border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
            <Construction className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            Under Maintenance
          </CardTitle>
          <CardDescription className="text-base mt-2">
            We're currently improving our services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Estimated downtime: {estimatedTime}
              </p>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              We're working hard to bring you new features and improvements. 
              Thank you for your patience!
            </p>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Follow us for updates:</p>
            <div className="flex gap-3 justify-center mt-2">
              <Link href="https://twitter.com/mvalex" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="mailto:status@mvalex.com" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/health">
              Check Status Page
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}