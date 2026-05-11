"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Smartphone, Mail, Key, RefreshCw } from "lucide-react";
import Image from "next/image";
import { LoadingShimmer } from "@/components/shared/ui/loading-shimmer";

export default function MFASetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("totp");

  // TOTP state
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // SMS state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  // Email state
  const [emailCode, setEmailCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // MFA status
  const [mfaStatus, setMfaStatus] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (session?.user?.id) {
      fetchMFAStatus();
    }
  }, [session, status, router]);

  async function fetchMFAStatus() {
    try {
      const res = await fetch("/api/mfa/status");
      if (res.ok) {
        const data = await res.json();
        setMfaStatus(data);
        setPhoneNumber(data.phoneNumber || "");
      }
    } catch (err) {
      console.error("Failed to fetch MFA status", err);
    }
  }

  // Start TOTP setup
  async function startTOTPSetup() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateTOTPSecret" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start TOTP setup");
      setTotpSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setBackupCodes(data.backupCodes || []);
      setShowBackupCodes(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Verify and enable TOTP
  async function verifyAndEnableTOTP() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyAndEnableTOTP", token: totpCode , deviceName: "Web" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setSuccess("TOTP MFA enabled successfully!");
      setShowBackupCodes(false);
      fetchMFAStatus();
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Send SMS code
  async function sendSMSCode() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendSmsCode", phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS");
      setSmsSent(true);
      setSuccess("SMS code sent!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Verify SMS code
  async function verifySMSCode() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifySmsCode", code: smsCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setSuccess("SMS MFA enabled successfully!");
      fetchMFAStatus();
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Send email code
  async function sendEmailCode() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendEmailCode" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      setEmailSent(true);
      setSuccess("Email code sent!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Verify email code
  async function verifyEmailCode() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyEmailCode", code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setSuccess("Email MFA enabled successfully!");
      fetchMFAStatus();
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Disable MFA
  async function disableMFA() {
    if (!confirm("Are you sure you want to disable MFA? This will make your account less secure.")) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disableMFA" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disable MFA");
      setSuccess("MFA disabled.");
      fetchMFAStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function regenerateBackupCodes() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mfa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate codes");
      setBackupCodes(data.codes);
      setShowBackupCodes(true);
      setSuccess("New backup codes generated! Save them securely.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (status === "loading") {
    return <LoadingShimmer />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      {/* Hearder with back button */}
      <div className="flex absolute top-10 left-10">
        <Button onClick={() => router.back()} className="text-sm text-muted-foreground bg-transparent">
          Back to Dashboard
        </Button>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">MFA Setup</CardTitle>
          <CardDescription>
            {mfaStatus?.enabled
              ? "Your account is protected with multi-factor authentication."
              : "Add an extra layer of security to your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded">{error}</div>
          )}
          {success && (
            <div className="text-sm text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded">{success}</div>
          )}

          {mfaStatus?.enabled && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">MFA is Enabled</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    Method: {mfaStatus.method}
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={disableMFA} disabled={isLoading}>
                Disable
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="totp">
                <Key className="h-4 w-4 mr-1" />
                Authenticator
              </TabsTrigger>
              <TabsTrigger value="sms">
                <Smartphone className="h-4 w-4 mr-1" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4">
              {!showBackupCodes ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use an authenticator app like Google Authenticator or Authy to generate codes.
                  </p>
                  <Button onClick={startTOTPSetup} disabled={isLoading} className="text-white">
                    {isLoading ? "Setting up..." : "Set Up Authenticator"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {qrCodeUrl && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-medium">Scan this QR code</p>
                      <div className="p-2 bg-white rounded-lg">
                        <Image
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                          alt="MFA QR Code"
                          width={200}
                          height={200}
                          className="rounded"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Or enter this key manually: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{totpSecret}</code>
                      </p>
                    </div>
                  )}

                  {backupCodes.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 space-y-2">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Save these backup codes</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        Each code can only be used once. Store them securely.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, i) => (
                          <code key={i} className="text-xs bg-white dark:bg-slate-800 p-1.5 rounded text-center font-mono">
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Enter code from app to confirm</Label>
                    <Input
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </div>
                  <Button onClick={verifyAndEnableTOTP} disabled={isLoading || totpCode.length < 6} className="w-full text-white">
                    {isLoading ? "Verifying..." : "Enable TOTP"}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1-555-0100"
                    disabled={smsSent}
                  />
                </div>
                {!smsSent ? (
                  <Button onClick={sendSMSCode} disabled={isLoading || phoneNumber.length < 8} className="w-full text-white">
                    {isLoading ? "Sending..." : "Send Verification Code"}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <Input
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setSmsSent(false)}>
                        Change Number
                      </Button>
                      <Button onClick={verifySMSCode} disabled={isLoading || smsCode.length < 6} className="flex-1 text-white">
                        {isLoading ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Verification codes will be sent to your registered email: {session?.user?.email}
                </p>
                {!emailSent ? (
                  <Button onClick={sendEmailCode} disabled={isLoading} className="w-full text-white">
                    {isLoading ? "Sending..." : "Send Verification Code"}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <Input
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setEmailSent(false)}>
                        Resend
                      </Button>
                      <Button onClick={verifyEmailCode} disabled={isLoading || emailCode.length < 6} className="flex-1 text-white">
                        {isLoading ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {mfaStatus?.enabled && mfaStatus.hasBackupCodes && (
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={regenerateBackupCodes} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Backup Codes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
