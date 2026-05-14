import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Kanban,
  LineChart,
  MapPin,
  MessageSquare,
  Ticket,
} from "lucide-react";
import type { UserRole } from "@/lib/user-roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket },
  {
    href: "/dashboard/boards",
    label: "Boards",
    icon: Kanban,
    roles: ["admin", "support"],
  },
  {
    href: "/dashboard/locations",
    label: "Locations",
    icon: MapPin,
    roles: ["admin"],
  },
  {
    href: "/dashboard/conversations",
    label: "Conversations",
    icon: MessageSquare,
    roles: ["admin", "support"],
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: LineChart,
    roles: ["admin"],
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.roles || (item.roles as readonly string[]).includes(role)
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
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/tickets": "Tickets",
    "/dashboard/tickets/new": "New ticket",
    "/dashboard/locations": "Locations",
    "/dashboard/conversations": "Conversations",
    "/dashboard/reports": "Reports",
    "/dashboard/boards": "Boards",
  };
  return map[pathname] ?? "Dashboard";
}
