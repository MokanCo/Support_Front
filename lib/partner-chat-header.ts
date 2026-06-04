import { apiFetch } from "@/lib/auth-fetch";
import {
  initialsFromDisplayName,
  type SupportChatHeaderModel,
} from "@/lib/support-chat-display";

export type SupportTeamMember = {
  id: string;
  name: string;
  online: boolean;
};

export type PartnerChatHeaderState = SupportChatHeaderModel & {
  supportTeam: SupportTeamMember[];
};

export function isAssignedHeader(header: PartnerChatHeaderState | null | undefined): boolean {
  return Boolean(header?.assignedTo && String(header.assignedTo).trim());
}

export function headerFromTicketProps(props: SupportChatHeaderModel): PartnerChatHeaderState {
  const assigned = Boolean(props.assignedTo && String(props.assignedTo).trim());
  const name = props.assignedToName?.trim() ?? "";
  if (assigned && name) {
    return {
      ...props,
      supportTeam: [
        {
          id: String(props.assignedTo),
          name,
          online: props.status !== "completed" && props.status !== "cancelled",
        },
      ],
    };
  }
  return { ...props, supportTeam: [] };
}

export function parsePartnerChatHeader(raw: unknown): PartnerChatHeaderState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const status = o.status != null ? String(o.status) : "open";
  const assignedTo =
    o.assignedTo != null && String(o.assignedTo).trim() ? String(o.assignedTo) : null;
  const assignedToName =
    o.assignedToName != null ? String(o.assignedToName) : null;
  const teamRaw = Array.isArray(o.supportTeam) ? o.supportTeam : [];
  const supportTeam: SupportTeamMember[] = teamRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = r.id != null ? String(r.id) : "";
      if (!id) return null;
      return {
        id,
        name: r.name != null ? String(r.name).trim() || "Support" : "Support",
        online: Boolean(r.online),
      };
    })
    .filter(Boolean) as SupportTeamMember[];
  return {
    status,
    assignedTo,
    assignedToName,
    supportTeam,
  };
}

export async function fetchPartnerChatHeader(
  ticketId: string,
): Promise<PartnerChatHeaderState | null> {
  const res = await apiFetch(
    `/api/tickets/${encodeURIComponent(ticketId)}/chat-header`,
  );
  const data: unknown = await res.json();
  if (!res.ok) return null;
  const header = (data as { chatHeader?: unknown }).chatHeader;
  return parsePartnerChatHeader(header);
}

export function patchPresenceOnHeader(
  header: PartnerChatHeaderState,
  userId: string,
  online: boolean,
): PartnerChatHeaderState {
  return {
    ...header,
    supportTeam: header.supportTeam.map((m) =>
      m.id === userId ? { ...m, online } : m,
    ),
  };
}

export function memberInitials(name: string): string {
  return initialsFromDisplayName(name);
}
