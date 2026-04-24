import { redirect } from "next/navigation";

export default function LegacyPartnerTicketsPage() {
  redirect("/dashboard/tickets");
}
