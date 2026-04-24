import { TicketDetailClient } from "./ticket-detail-client";

export default function TicketDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const chat = searchParams?.chat;
  const openChat =
    chat === "1" ||
    chat === "true" ||
    searchParams?.openChat === "1" ||
    searchParams?.openChat === "true";

  return (
    <div className="mx-auto max-w-4xl">
      <TicketDetailClient ticketId={params.id} initialOpenChat={Boolean(openChat)} />
    </div>
  );
}
