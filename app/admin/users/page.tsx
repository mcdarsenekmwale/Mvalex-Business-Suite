//redirect to all users
import { redirect } from "next/navigation";

export default function UsersRedirect() {
  redirect("/admin/users/all");
}
