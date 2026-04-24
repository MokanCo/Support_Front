import type { LucideIcon } from "lucide-react";
import { Headphones, Globe, Truck, Layers } from "lucide-react";

export type QuickTicketTemplate = {
  id: string;
  label: string;
  descriptionLine: string;
  title: string;
  body: string;
  category: string;
  icon: LucideIcon;
};

export const QUICK_TICKET_TEMPLATES: QuickTicketTemplate[] = [
  {
    id: "it-support",
    label: "IT support",
    descriptionLine: "Workstations, network, access, and hardware",
    title: "IT support request",
    body: "Please describe your IT issue, what you were trying to do, and any error messages you see.",
    category: "IT Support",
    icon: Headphones,
  },
  {
    id: "google-support",
    label: "Google Support",
    descriptionLine: "Workspace, Gmail, Drive, and related tools",
    title: "Google / Workspace support",
    body: "Describe the Google or Workspace product involved and what you need help with.",
    category: "Google Support",
    icon: Globe,
  },
  {
    id: "delivery-integration",
    label: "Delivery integration",
    descriptionLine: "Delivery platforms and order sync",
    title: "Delivery integration support",
    body: "Include your delivery provider, POS or integration name, and what is failing or out of sync.",
    category: "Delivery integration",
    icon: Truck,
  },
  {
    id: "appfront-support",
    label: "Appfront support",
    descriptionLine: "Appfront ordering and configuration",
    title: "Appfront support request",
    body: "Describe your Appfront issue, store context, and any steps to reproduce.",
    category: "Appfront support",
    icon: Layers,
  },
];

export function getQuickTicketTemplate(
  id: string | null | undefined
): QuickTicketTemplate | null {
  if (!id) return null;
  return QUICK_TICKET_TEMPLATES.find((t) => t.id === id) ?? null;
}
