"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client";

function TicketViewInner() {
  const sp = useSearchParams();
  const id = sp.get("id") ?? "";
  const openChat =
    sp.get("chat") === "1" ||
    sp.get("chat") === "true" ||
    sp.get("openChat") === "1" ||
    sp.get("openChat") === "true";

  if (!id) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-slate-600">
        Missing ticket id.{" "}
        <Link href="/dashboard/tickets" className="text-primary-600 underline">
          Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <TicketDetailClient ticketId={id} initialOpenChat={openChat} />
    </div>
  );
}

export default function TicketViewPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-6 text-sm text-slate-500">Loading…</div>
      }
    >
      <TicketViewInner />
    </Suspense>
  );
}
