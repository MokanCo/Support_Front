import { redirect } from "next/navigation";

export default function LegacyAdminTicketsPage() {
  redirect("/dashboard/tickets");
}
