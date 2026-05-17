import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  CreditCard,
  Globe,
  Headphones,
  Layers,
  Monitor,
  Store,
  Truck,
} from "lucide-react";

export type QuickTicketTemplate = {
  id: string;
  label: string;
  descriptionLine: string;
  title: string;
  body: string;
  category: string;
  icon: LucideIcon;
  /** Partner dashboard card: optional headline with a smaller middle segment (e.g. small “U” in “Updates”). */
  cardTitleParts?: { before: string; small: string; after: string };
};

export const QUICK_TICKET_TEMPLATES: QuickTicketTemplate[] = [
  {
    id: "it-support",
    label: "IT / Web",
    descriptionLine: "Workstations, network, access, and hardware",
    title: "IT / Web request",
    body: "Please describe your IT issue, what you were trying to do, and any error messages you see.",
    category: "IT / Web",
    icon: Headphones,
  },
  {
    id: "google-support",
    label: "Google",
    descriptionLine: "Workspace, Gmail, Drive, and related tools",
    title: "Google / Workspace request",
    body: "Describe the Google or Workspace product involved and what you need help with.",
    category: "Google",
    icon: Globe,
  },
  {
    id: "delivery-integration",
    label: "Delivery integration",
    descriptionLine: "Delivery platforms and order sync",
    title: "Delivery integration request",
    body: "Include your delivery provider, POS or integration name, and what is failing or out of sync.",
    category: "Delivery integration",
    icon: Truck,
  },
  {
    id: "appfront-support",
    label: "Appfront",
    descriptionLine: "Appfront ordering and configuration",
    title: "Appfront request",
    body: "Describe your Appfront issue, store context, and any steps to reproduce.",
    category: "Appfront",
    icon: Layers,
  },
  {
    id: "toast-support",
    label: "Toast",
    descriptionLine: "Toast POS, orders, KDS, and in-store operations",
    title: "Toast request",
    body: "Describe your Toast issue (e.g. orders, payments, printers, KDS, or configuration), your location, and any error messages or order examples.",
    category: "Toast",
    icon: Store,
  },
  {
    id: "payment-transaction-support",
    label: "Payment / Transaction",
    descriptionLine: "Card readers, declines, refunds, and settlement questions",
    title: "Payment / transaction request",
    body: "Include the date/time, amount, tender type, last four of the card if applicable, and what you expected versus what happened.",
    category: "Payment / Transaction",
    icon: CreditCard,
  },
  {
    id: "menu-item-updates-support",
    label: "Menu / Item Updates",
    descriptionLine: "Menu changes, pricing, modifiers, and item availability",
    title: "Menu / item updates request",
    body: "List the items or categories to change, current vs desired behavior, and whether this is urgent for service (e.g. wrong price on the floor).",
    category: "Menu / Item Updates",
    icon: ClipboardList,
    cardTitleParts: { before: "Menu / Item ", small: "U", after: "pdates" },
  },
  {
    id: "device-hardware-support",
    label: "Device / Hardware",
    descriptionLine: "Terminals, tablets, printers, and network gear",
    title: "Device / hardware request",
    body: "Describe the device (model if known), what is not working, troubleshooting already tried, and whether the store is blocked.",
    category: "Device / Hardware",
    icon: Monitor,
  },
];

export function getQuickTicketTemplate(
  id: string | null | undefined
): QuickTicketTemplate | null {
  if (!id) return null;
  return QUICK_TICKET_TEMPLATES.find((t) => t.id === id) ?? null;
}
