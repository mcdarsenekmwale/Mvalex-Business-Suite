// app/admin/page.tsx
// Admin Dashboard
//redirects to dashboard
import { redirect } from "next/navigation";

export default function AdminDashboard() {
  redirect("/admin/dashboard");
}
