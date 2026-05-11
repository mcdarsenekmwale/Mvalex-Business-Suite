// Support agent Tickets Layout

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function SupportTicketsLayout({ children }: { children: ReactNode }) {

 const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return (
    <>
        {children}
    </>
  );
}
