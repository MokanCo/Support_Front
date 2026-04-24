/** Chat header + presence derived from ticket assignment and lifecycle status. */

export type SupportChatHeaderModel = {
  status: string;
  assignedTo: string | null;
  assignedToName?: string | null;
};

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueFromSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** HSL background tuned for white initials (slightly deeper soft tone). */
export function avatarBackgroundFromSeed(seed: string): string {
  const h = hueFromSeed(seed || "support");
  return `hsl(${h} 42% 46%)`;
}

export function getSupportChatHeaderDisplay(
  ticket: SupportChatHeaderModel | null | undefined
): {
  title: string;
  initials: string;
  presence: "online" | "offline" | "none";
  colorSeed: string;
} {
  if (!ticket) {
    return {
      title: "Support Team",
      initials: "ST",
      presence: "none",
      colorSeed: "support-team",
    };
  }
  const assigned = Boolean(ticket.assignedTo && String(ticket.assignedTo).trim());
  const name = ticket.assignedToName?.trim() ?? "";
  const terminal = ticket.status === "completed" || ticket.status === "cancelled";

  if (assigned && name) {
    return {
      title: name,
      initials: initialsFromDisplayName(name),
      presence: terminal ? "offline" : "online",
      colorSeed: name,
    };
  }
  if (assigned) {
    return {
      title: "Support team member",
      initials: "SM",
      presence: terminal ? "offline" : "online",
      colorSeed: String(ticket.assignedTo),
    };
  }
  return {
    title: "Support Team",
    initials: "ST",
    presence: "none",
    colorSeed: "support-team",
  };
}
