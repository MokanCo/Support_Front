"use client";

import type { ClientMessageRow } from "@/lib/messages-client";
import { formatMessageTime, messageRowSenderLabel } from "@/lib/messages-client";

type Props = {
  m: ClientMessageRow;
  viewerUserId: string;
  /** FAB uses slightly narrower bubbles. */
  compact?: boolean;
};

export function TicketMessageBubble({ m, viewerUserId, compact }: Props) {
  const mine = !m.isSystem && m.senderId === viewerUserId;
  const label = messageRowSenderLabel(m);
  const maxW = compact ? "max-w-[85%]" : "max-w-[min(100%,520px)]";

  const tone = m.isSystem
    ? "bg-slate-100/95 text-slate-700 ring-slate-200/90"
    : mine
      ? "bg-primary-600 text-white ring-primary-500/30"
      : "bg-slate-50 text-slate-800 ring-slate-200/80";

  const metaMuted = m.isSystem
    ? "text-slate-500"
    : mine
      ? "text-primary-100"
      : "text-slate-400";

  const nameClass = m.isSystem
    ? "font-semibold text-slate-600"
    : mine
      ? "font-semibold text-white"
      : "font-semibold text-slate-700";

  const bodyClass = m.isSystem ? "text-slate-700" : mine ? "text-white" : "";

  return (
    <div className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`${maxW} rounded-2xl px-3 py-2.5 text-sm shadow-sm ring-1 ring-inset sm:px-4 sm:py-3 ${tone}`}
      >
        <div className={`flex items-center justify-between gap-2 text-[10px] sm:gap-3 sm:text-[11px] ${metaMuted}`}>
          <span className={nameClass}>{label}</span>
          <span>{formatMessageTime(m.createdAt)}</span>
        </div>
        <p className={`mt-1.5 whitespace-pre-wrap leading-relaxed sm:mt-2 ${bodyClass}`}>{m.text}</p>
      </div>
    </div>
  );
}
