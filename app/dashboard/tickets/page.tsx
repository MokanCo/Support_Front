"use client";

import { useSession } from "@/lib/session-context";
import { TicketsTable } from "@/components/tickets/tickets-table";

export default function TicketsPage() {
  const { user } = useSession();
  return <TicketsTable role={user.role} />;
}
