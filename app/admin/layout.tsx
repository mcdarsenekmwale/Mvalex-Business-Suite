// app/admin/layout.tsx (Server Component)
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/permissions";
import { AdminClientLayout } from "@/components/admin/layout/AdminClientLayout";

export const metadata: Metadata = {
  title: "Admin Panel - Mvalex Business Suite",
  description: "Platform administration and management",
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id || !isAdmin(session.user.role as any)) {
    redirect("/unauthorized");
  }

  return (
    <AdminClientLayout session={session}>
      {children}
    </AdminClientLayout>
  );
}