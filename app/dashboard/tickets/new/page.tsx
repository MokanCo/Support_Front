"use client";

import { Suspense } from "react";
import { useSession } from "@/lib/session-context";
import { NewTicketPageClient } from "@/components/tickets/new-ticket-page-client";

export default function NewTicketPage() {
  const { user } = useSession();
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-500">Loading new ticket…</p>}
    >
      <NewTicketPageClient role={user.role} />
    </Suspense>
  );
}
