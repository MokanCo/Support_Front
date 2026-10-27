import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Kanban,
  LineChart,
  MapPin,
  MessageSquare,
  Ticket,
  ClipboardList,
  FileText,
  ImageIcon,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/lib/user-roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly UserRole[];
  /** When set, staff sidebar shows a numeric badge (admin + support only). */
  badgeSource?: "tickets" | "conversations";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket, badgeSource: "tickets" },
  // {
  //   href: "/dashboard/boards",
  //   label: "Boards",
  //   icon: Kanban,
  //   roles: ["admin", "support"],
  // },
  {
    href: "/dashboard/locations",
    label: "Locations",
    icon: MapPin,
    roles: ["admin"],
  },
  {
    href: "/dashboard/onboardings",
    label: "Onboardings",
    icon: ClipboardList,
    roles: ["admin", "support"],
  },
  {
    href: "/dashboard/conversations",
    label: "Conversations",
    icon: MessageSquare,
    roles: ["admin", "support"],
    badgeSource: "conversations",
  },
  {
    href: "/dashboard/ar",
    label: "Accounts",
    icon: Wallet,
    roles: ["admin", "support", "partner"],
  },
  {
    href: "/dashboard/documents",
    label: "Documents",
    icon: FileText,
    roles: ["admin", "partner"],
  },
  {
    href: "/dashboard/marketing-assets",
    label: "Marketing Assets",
    icon: ImageIcon,
    roles: ["admin", "partner"],
  },
  // {
  //   href: "/dashboard/reports",
  //   label: "Reports",
  //   icon: LineChart,
  //   roles: ["admin"],
  // },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.roles || (item.roles as readonly string[]).includes(role),
  );
}

export function titleForPath(pathname: string): string {
  if (pathname === "/dashboard/conversations") {
    return "Conversations";
  }
  if (pathname === "/dashboard/boards") {
    return "Boards";
  }
  if (pathname === "/dashboard/tickets/new") {
    return "New ticket";
  }
  if (pathname === "/dashboard/tickets/view") {
    return "Ticket";
  }
  if (pathname === "/dashboard/locations/view") {
    return "Location";
  }
  if (pathname === "/dashboard/onboardings/view") {
    return "Onboarding";
  }
  if (pathname === "/dashboard/onboardings") {
    return "Onboardings";
  }
  if (pathname.startsWith("/dashboard/ar")) {
    return "Accounts";
  }
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/tickets": "Tickets",
    "/dashboard/tickets/new": "New ticket",
    "/dashboard/locations": "Locations",
    "/dashboard/onboardings": "Onboardings",
    "/dashboard/conversations": "Conversations",
    "/dashboard/reports": "Reports",
    "/dashboard/boards": "Boards",
    "/dashboard/documents": "Documents",
    "/dashboard/marketing-assets": "Marketing Assets",
    "/dashboard/ar": "Accounts",
  };
  return map[pathname] ?? "Dashboard";
}
