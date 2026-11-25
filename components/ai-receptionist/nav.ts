import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  BookOpen,
  Bot,
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Phone,
  Settings,
} from "lucide-react";

export const AI_RECEPTIONIST_BASE = "/dashboard/ai-receptionist";

export type AiReceptionistNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const AI_RECEPTIONIST_NAV: AiReceptionistNavItem[] = [
  { href: AI_RECEPTIONIST_BASE, label: "Overview", icon: LayoutDashboard },
  {
    href: `${AI_RECEPTIONIST_BASE}/phone-numbers`,
    label: "Branch Phone Numbers",
    icon: Phone,
  },
  { href: `${AI_RECEPTIONIST_BASE}/agent`, label: "AI Agent Settings", icon: Bot },
  { href: `${AI_RECEPTIONIST_BASE}/knowledge`, label: "Knowledge Base", icon: BookOpen },
  { href: `${AI_RECEPTIONIST_BASE}/branches`, label: "Branch Information", icon: MapPin },
  { href: `${AI_RECEPTIONIST_BASE}/calls`, label: "Call History", icon: History },
  { href: `${AI_RECEPTIONIST_BASE}/sms`, label: "SMS Inbox", icon: MessageSquare },
  {
    href: `${AI_RECEPTIONIST_BASE}/recordings`,
    label: "Recordings & Transcripts",
    icon: AudioLines,
  },
  { href: `${AI_RECEPTIONIST_BASE}/analytics`, label: "Analytics", icon: ChartNoAxesCombined },
  { href: `${AI_RECEPTIONIST_BASE}/settings`, label: "System Settings", icon: Settings },
];

export function isAiReceptionistNavActive(href: string, pathname: string): boolean {
  if (href === AI_RECEPTIONIST_BASE) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
