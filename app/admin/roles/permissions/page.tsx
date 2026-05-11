import { redirect } from "next/navigation";

export default function RolesPermissionsRedirect() {
  redirect("/admin/roles");
}
