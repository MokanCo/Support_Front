"use client";

import type { CSSProperties } from "react";
import { avatarBackgroundFromSeed } from "@/lib/support-chat-display";

type Presence = "online" | "offline" | "none";

type Props = {
  initials: string;
  size?: number;
  presence?: Presence;
  /** Used to pick a stable soft background color. */
  colorSeed?: string;
  className?: string;
  accessibilityLabel?: string;
};

const DOT = 10;

type StackMember = {
  id: string;
  initials: string;
  colorSeed: string;
  presence?: Presence;
  name?: string;
};

export function AvatarStack({
  members,
  size = 40,
  maxVisible = 5,
  className = "",
}: {
  members: StackMember[];
  size?: number;
  maxVisible?: number;
  className?: string;
}) {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - visible.length;
  const overlap = Math.round(size * 0.28);

  return (
    <span className={`inline-flex items-center ${className}`}>
      {visible.map((m, i) => (
        <span
          key={m.id}
          className="relative inline-flex"
          style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: visible.length - i }}
        >
          <Avatar
            initials={m.initials}
            size={size}
            presence={m.presence}
            colorSeed={m.colorSeed}
            accessibilityLabel={m.name ?? m.initials}
          />
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className="relative inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white"
          style={{
            width: size,
            height: size,
            marginLeft: visible.length > 0 ? -overlap : 0,
            fontSize: Math.max(10, Math.round(size * 0.28)),
            zIndex: 0,
          }}
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}

export function Avatar({
  initials,
  size = 40,
  presence = "none",
  colorSeed = "user",
  className = "",
  accessibilityLabel,
}: Props) {
  const bg = avatarBackgroundFromSeed(colorSeed);
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.34)),
    backgroundColor: bg,
  };

  return (
    <span
      role="img"
      aria-label={accessibilityLabel ?? `Avatar ${(initials || "?").slice(0, 2)}`}
      className={`relative inline-flex flex-shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase tracking-tight text-white shadow-sm ring-2 ring-white ${className}`}
      style={style}
    >
      {(initials || "?").slice(0, 2)}
      {presence !== "none" ? (
        <span
          className={`absolute rounded-full ring-2 ring-white ${
            presence === "online" ? "bg-emerald-500" : "bg-slate-400"
          }`}
          style={{
            width: DOT,
            height: DOT,
            right: -1,
            bottom: -1,
          }}
          title={presence === "online" ? "Online" : "Offline"}
          aria-label={presence === "online" ? "Online" : "Offline"}
        />
      ) : null}
    </span>
  );
}
