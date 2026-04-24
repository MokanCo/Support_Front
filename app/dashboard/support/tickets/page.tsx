import { redirect } from "next/navigation";

export default function LegacySupportTicketsPage() {
  redirect("/dashboard/tickets");
}
