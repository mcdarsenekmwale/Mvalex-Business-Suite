import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Redirect to MFA verification if required
  if ((session.user as any).mfaRequired && !(session.user as any).mfaVerifiedAt) {
    redirect("/auth/mfa?redirect=/dashboard");
  }

  return <>{children}</>;
}
