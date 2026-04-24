import { redirect } from "next/navigation";

export default function LegacyAdminOrganizationsPage() {
  redirect("/dashboard/locations");
}
