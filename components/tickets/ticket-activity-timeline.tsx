"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { TicketActivityItem, TicketActivityKind } from "@/lib/ticket-activity";

function kindAccent(kind: TicketActivityKind): string {
  switch (kind) {
    case "ticket_created":
      return "bg-emerald-500";
    case "status_changed":
      return "bg-primary-500";
    case "priority_changed":
      return "bg-amber-500";
    case "assignee_changed":
      return "bg-violet-500";
    case "progress_changed":
      return "bg-primary-500";
    case "deadline_changed":
      return "bg-rose-500";
    case "message_sent":
      return "bg-slate-500";
    default:
      return "bg-slate-400";
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TicketActivityTimeline({ items }: { items: TicketActivityItem[] }) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200/80 shadow-sm">
      <CardHeader title="Activity" description="Who changed what on this ticket" />
      <CardBody className="min-h-0 flex-1 p-0">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No activity recorded yet. Changes you make will appear here.
          </p>
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain px-5 py-6">
            <ul className="relative space-y-0">
              {items.map((ev, i) => (
                <li key={ev.id} className="relative flex gap-0 pb-8 last:pb-0">
                  {i < items.length - 1 ? (
                    <span
                      className="absolute left-[0.6rem] top-3 bottom-0 w-px bg-slate-200"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative z-[1] flex w-5 shrink-0 justify-center pt-1">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${kindAccent(ev.kind)}`}
                      title={ev.kind}
                    />
                  </div>
                  <div className="min-w-0 flex-1 pl-3">
                    <time
                      className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                      dateTime={ev.at}
                    >
                      {formatWhen(ev.at)}
                    </time>
                    <p className="mt-1 text-sm leading-snug text-slate-800">{ev.summary}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{ev.actorName}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
