/** Chat header + presence derived from ticket assignment and lifecycle status. */

export type SupportTeamMember = {
  id: string;
  name: string;
  online: boolean;
};

export type SupportChatHeaderModel = {
  status: string;
  assignedTo: string | null;
  assignedToName?: string | null;
  supportTeam?: SupportTeamMember[];
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
  ticket: SupportChatHeaderModel | null | undefined,
): {
  title: string;
  members: SupportTeamMember[];
  stacked: boolean;
} {
  if (!ticket) {
    return {
      title: "Support Team",
      members: [{ id: "support-team", name: "Support Team", online: false }],
      stacked: false,
    };
  }

  const team = ticket.supportTeam ?? [];
  const assigned = Boolean(ticket.assignedTo && String(ticket.assignedTo).trim());
  const terminal = ticket.status === "completed" || ticket.status === "cancelled";
  const name = ticket.assignedToName?.trim() ?? "";

  if (assigned && team.length > 0) {
    const member = team[0];
    return {
      title: name || member.name || "Support team member",
      members: [
        {
          ...member,
          online: terminal ? false : member.online,
        },
      ],
      stacked: false,
    };
  }

  if (assigned && name) {
    return {
      title: name,
      members: [
        {
          id: String(ticket.assignedTo),
          name,
          online: !terminal,
        },
      ],
      stacked: false,
    };
  }

  if (team.length > 0) {
    return {
      title: "Support Team",
      members: team.map((m) => ({
        ...m,
        online: terminal ? false : m.online,
      })),
      stacked: team.length > 1,
    };
  }

  return {
    title: "Support Team",
    members: [{ id: "support-team", name: "Support Team", online: false }],
    stacked: false,
  };
}
