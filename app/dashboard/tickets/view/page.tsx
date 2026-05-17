"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client";
import { TicketDetailPageSkeleton } from "@/components/ui/skeleton";

function TicketViewInner() {
  const sp = useSearchParams();
  const id = sp.get("id") ?? "";

  if (!id) {
    return (
      <p className="text-sm text-slate-600">
        Missing ticket id.{" "}
        <Link href="/dashboard/tickets" className="text-primary-600 underline">
          Back to tickets
        </Link>
      </p>
    );
  }

  return <TicketDetailClient ticketId={id} />;
}

export default function TicketViewPage() {
  return (
    <Suspense
      fallback={<TicketDetailPageSkeleton />}
    >
      <TicketViewInner />
    </Suspense>
  );
}
