"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Smartphone, Key, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MFAVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"totp" | "sms" | "email" | "backup">("totp");
  const [code, setCode] = useState("");
  const [mfaStatus, setMfaStatus] = useState<any>(null);
  const [trustDevice, setTrustDevice] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const redirectTo = searchParams.get("redirect") || searchParams.get("callbackUrl") || "/dashboard";

  // Fetch MFA status on load
  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoadingStatus(false);
      return;
    }
    
    const fetchMFAStatus = async () => {
      try {
        const res = await fetch("/api/mfa/status");
        const data = await res.json();
        setMfaStatus(data);
        
        // If MFA is not enabled and setup is not required, redirect to dashboard
        if (!data.requiresMFA && !data.requiresMFAVerification && !data.isMFAEnabled) {
          router.push(redirectTo);
        }
        
        // If MFA setup is required, redirect to setup page
        if (data.requiresMFA) {
          router.push("/auth/mfa/setup");
        }
      } catch (error) {
        console.error("Failed to fetch MFA status:", error);
      } finally {
        setIsLoadingStatus(false);
      }
    };
    
    fetchMFAStatus();
  }, [session?.user?.id, router, redirectTo]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Verify MFA code
  async function handleVerify(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }
    
    if (!code || (method !== "backup" && code.length !== 6)) {
      toast.error(method === "backup" ? "Please enter a valid backup code" : "Please enter a valid 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: code, 
          method: method === "totp" ? "totp" : method,
          trustDevice 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid verification code");
        setError(data.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      toast.success("MFA verification successful!");
      
      // Update session to mark MFA as verified
      await update({ 
        mfaVerified: true, 
        mfaVerifiedAt: Date.now() 
      });

      // Small delay to ensure session is updated
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 500);
      
    } catch (err) {
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  // Resend MFA code
  async function handleResendCode(type: "sms" | "email") {
    if (countdown > 0) return;
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Failed to send ${type} code`);
        toast.error(data.error || "Failed to send code");
      } else {
        toast.success(`Verification code sent via ${type.toUpperCase()}`);
        setCountdown(60);
      }
    } catch {
      toast.error("Failed to send verification code");
      setError("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state
  if (isLoadingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Checking security settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If MFA is not required, don't show the verification page
  if (!mfaStatus?.requiresMFAVerification && !mfaStatus?.isMFAEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">MFA Not Required</h2>
            <p className="text-muted-foreground mb-4">
              Your account does not require multi-factor authentication at this time.
            </p>
            <Button onClick={() => router.push(redirectTo)} className="bg-primary text-white">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter your verification code to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={method} onValueChange={(v) => {
            setMethod(v as any);
            setCode("");
            setError("");
          }}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="totp">
                <Key className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">TOTP</span>
              </TabsTrigger>
              <TabsTrigger value="sms" disabled={!mfaStatus?.phoneNumber}>
                <Smartphone className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">SMS</span>
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="backup">
                <Shield className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp">
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp-code">Authenticator App Code</Label>
                  <Input
                    id="totp-code"
                    value={code}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    type="text"
                    pattern="\\d{6}"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                    required
                  />
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Open your authenticator app (Google Authenticator, Microsoft Authenticator, etc.) 
                      and enter the 6-digit code shown for Mvalex Business Suite.
                    </AlertDescription>
                  </Alert>
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full bg-primary text-white" disabled={isLoading || code.length !== 6}>
                  {isLoading ? "Verifying..." : "Verify & Continue"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="sms">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-code">SMS Code</Label>
                  <Input
                    id="sms-code"
                    value={code}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    A verification code will be sent to your registered phone number
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={countdown > 0 || isLoading}
                    onClick={() => handleResendCode("sms")}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend SMS"}
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1 bg-primary text-white" 
                    disabled={isLoading || code.length !== 6}
                    onClick={() => handleVerify()}
                  >
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="email">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-code">Email Code</Label>
                  <Input
                    id="email-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    A verification code will be sent to your registered email address
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={countdown > 0 || isLoading}
                    onClick={() => handleResendCode("email")}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend Email"}
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1 bg-primary text-white" 
                    disabled={isLoading || code.length !== 6}
                    onClick={() => handleVerify()}
                  >
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-code">Backup Code</Label>
                  <Input
                    id="backup-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use one of your saved backup codes. Each code can only be used once.
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded">
                    {error}
                  </div>
                )}
                <Button 
                  type="button" 
                  className="w-full bg-primary text-white" 
                  disabled={isLoading || code.length < 8}
                  onClick={() => handleVerify()}
                >
                  {isLoading ? "Verifying..." : "Verify Backup Code"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trust-device"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="trust-device" className="text-sm cursor-pointer">
                Trust this device for 30 days
              </Label>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              <a href="/auth/mfa/recovery" className="text-primary hover:underline">
                Lost access to your authenticator app?
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}