"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose } from "lucide-react";
import type { UserRole } from "@/models/User";
import { navItemsForRole } from "@/components/saas/nav-config";

export const SIDEBAR_STORAGE_KEY = "mokanco_sidebar_collapsed";

function isNavActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  role,
  collapsed,
  onMobileClose,
}: {
  role: UserRole;
  collapsed: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  const linkClass = (active: boolean) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    } ${collapsed ? "justify-center" : ""}`;

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 items-center border-b border-white/5 px-4 ${
          collapsed ? "justify-center" : "justify-between gap-2"
        }`}
      >
        {!collapsed ? (
          <Link href="/dashboard" className="truncate text-sm font-semibold tracking-tight">
            <span className="text-white">Mokanco</span>
            <span className="text-slate-500"> Desk</span>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white"
          >
            M
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onMobileClose()}
              className={linkClass(active)}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                  active ? "text-primary-200" : "text-slate-400 group-hover:text-white"
                }`}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar({
  role,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: {
  role: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const rail = collapsed ? "w-14" : "w-48";

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/5 bg-slate-950 transition-[width] duration-300 ease-out lg:block ${rail}`}
      >
        <SidebarContent role={role} collapsed={collapsed} onMobileClose={() => {}} />
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-[60] w-52 border-r border-white/5 bg-slate-950 transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent role={role} collapsed={false} onMobileClose={onMobileClose} />
      </aside>
    </>
  );
}
