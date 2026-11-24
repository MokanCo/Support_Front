"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Wallet, X } from "lucide-react";
import type { UserRole } from "@/lib/user-roles";
import {
  accountsNavForRole,
  isAccountsNavActive,
  type AccountsNavGroup,
} from "@/components/ar/accounts-nav";

function NavList({
  groups,
  pathname,
  onNavigate,
}: {
  groups: AccountsNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          {group.label ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isAccountsNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-[17px] w-[17px] shrink-0 transition-colors duration-200 ${
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.tag ? (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-white"
                    }`}
                  >
                    {item.tag}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 pb-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
        <Wallet className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
          Accounts
        </p>
        <p className="truncate text-[11px] text-slate-400">Financial workspace</p>
      </div>
    </div>
  );
}

/** Trigger rendered in the page header on screens below `lg`. */
export function AccountsMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
    >
      <Menu className="h-4 w-4" />
      Accounts menu
    </button>
  );
}

/**
 * Dedicated Accounts navigation. Sticks to the viewport on desktop so only the
 * page content scrolls, and collapses into a slide-in drawer below `lg`.
 */
export function AccountsSidebar({
  role,
  drawerOpen,
  onDrawerClose,
}: {
  role: UserRole;
  drawerOpen: boolean;
  onDrawerClose: () => void;
}) {
  const pathname = usePathname();
  const groups = accountsNavForRole(role);

  useEffect(() => {
    onDrawerClose();
    // Close the drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDrawerClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, onDrawerClose]);

  return (
    <>
      {/* Fixed rail: fills the layout height and scrolls internally only if the
          nav is taller than the viewport. */}
      <aside className="hidden h-full w-56 shrink-0 lg:block">
        <div className="ar-scroll h-full overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          <Brand />
          <NavList groups={groups} pathname={pathname} />
        </div>
      </aside>

      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close Accounts menu"
          onClick={onDrawerClose}
          className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`ar-scroll fixed inset-y-0 left-0 z-[80] w-64 overflow-y-auto border-r border-slate-200 bg-white p-3 transition-transform duration-300 ease-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-start justify-between">
          <Brand />
          <button
            type="button"
            onClick={onDrawerClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavList groups={groups} pathname={pathname} onNavigate={onDrawerClose} />
      </aside>
    </>
  );
}
