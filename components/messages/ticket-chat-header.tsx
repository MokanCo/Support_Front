"use client";

import { Avatar } from "@/components/ui/Avatar";
import {
  getSupportChatHeaderDisplay,
  type SupportChatHeaderModel,
} from "@/lib/support-chat-display";

type Props = {
  ticket: SupportChatHeaderModel | null | undefined;
  subtitle?: string;
  className?: string;
};

export function TicketChatHeader({ ticket, subtitle, className = "" }: Props) {
  const { title, initials, presence, colorSeed } = getSupportChatHeaderDisplay(ticket);

  return (
    <div
      className={`flex items-center gap-3 border-b border-slate-200/90 bg-slate-50/95 px-4 py-3 sm:px-5 ${className}`}
    >
      <Avatar
        initials={initials}
        size={40}
        presence={presence}
        colorSeed={colorSeed}
        accessibilityLabel={[title, presence === "online" ? "online" : presence === "offline" ? "offline" : null]
          .filter(Boolean)
          .join(", ")}
      />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}
