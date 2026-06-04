"use client";

import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import {
  getSupportChatHeaderDisplay,
  initialsFromDisplayName,
  type SupportChatHeaderModel,
} from "@/lib/support-chat-display";

type Props = {
  ticket: SupportChatHeaderModel | null | undefined;
  subtitle?: string;
  className?: string;
};

export function TicketChatHeader({ ticket, subtitle, className = "" }: Props) {
  const { title, members, stacked } = getSupportChatHeaderDisplay(ticket);
  const anyOnline = members.some((m) => m.online);

  const avatarNodes = stacked ? (
    <AvatarStack
      members={members.map((m) => ({
        id: m.id,
        initials: initialsFromDisplayName(m.name),
        colorSeed: m.id,
        presence: m.online ? "online" : "offline",
        name: m.name,
      }))}
      size={40}
      maxVisible={5}
    />
  ) : (
    <Avatar
      initials={initialsFromDisplayName(members[0]?.name ?? "Support")}
      size={40}
      presence={
        members[0]?.online
          ? "online"
          : members[0] && members[0].id !== "support-team"
            ? "offline"
            : "none"
      }
      colorSeed={members[0]?.id ?? "support-team"}
      accessibilityLabel={[
        members[0]?.name ?? title,
        members[0]?.online ? "online" : null,
      ]
        .filter(Boolean)
        .join(", ")}
    />
  );

  return (
    <div
      className={`flex items-center gap-3 border-b border-slate-200/90 bg-slate-50/95 px-4 py-3 sm:px-5 ${className}`}
    >
      {avatarNodes}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        ) : stacked && anyOnline ? (
          <p className="mt-0.5 text-xs text-emerald-600">Someone from support is online</p>
        ) : null}
      </div>
    </div>
  );
}
