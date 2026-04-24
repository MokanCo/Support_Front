"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { titleForPath } from "@/components/saas/nav-config";
import type { UserRole } from "@/models/User";
import {
  messageInboxPreviewText,
  useMessageInbox,
  type MessageInboxItem,
} from "@/lib/message-inbox-context";

export function AppHeader({
  name,
  email,
  locationName,
  role,
  onMenuClick,
  onLogout,
}: {
  name?: string | null;
  email: string;
  locationName?: string | null;
  role: UserRole;
  onMenuClick: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleForPath(pathname);
  const {
    items,
    headerUnreadCount,
    clearTicketNotification,
  } = useMessageInbox();

  const initials =
    (name ?? email)
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!userMenuRef.current?.contains(t)) setUserMenuOpen(false);
      if (!bellRef.current?.contains(t)) setBellOpen(false);
    }
    if (userMenuOpen || bellOpen) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
  }, [userMenuOpen, bellOpen]);

  const dropdownItems =
    items.filter((i) => i.highlight).length > 0
      ? items.filter((i) => i.highlight)
      : items.slice(0, 12);

  function onSelectInboxItem(item: MessageInboxItem) {
    clearTicketNotification(item.ticketId);
    setBellOpen(false);
    router.push(`/dashboard/tickets/${encodeURIComponent(item.ticketId)}?chat=1`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {locationName ? `${locationName} · ` : null}
            Workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((o) => !o)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-label={
              headerUnreadCount > 0
                ? `${headerUnreadCount} unread message notifications`
                : "Notifications"
            }
            aria-expanded={bellOpen}
          >
            <Bell className="h-[18px] w-[18px]" />
            {headerUnreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {headerUnreadCount > 9 ? "9+" : headerUnreadCount}
              </span>
            ) : null}
          </button>

          {bellOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg ring-1 ring-slate-900/5"
              role="menu"
            >
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Messages
              </p>
              {dropdownItems.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">No recent notifications.</p>
              ) : (
                <ul className="space-y-1 px-2">
                  {dropdownItems.map((item) => (
                    <li key={item.ticketId}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onSelectInboxItem(item)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          item.highlight
                            ? "bg-primary-50 ring-2 ring-primary-200 ring-offset-1 ring-offset-white"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-medium text-slate-900">
                          {item.ticketCode ? (
                            <span className="text-primary-700">{item.ticketCode}</span>
                          ) : null}
                          {item.ticketCode ? " · " : null}
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {messageInboxPreviewText(item)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm font-medium text-slate-900">{name ?? email}</p>
              <p className="truncate text-xs capitalize text-slate-500">{role}</p>
            </div>
            <ChevronDown
              className={`mr-1 hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block ${
                userMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {userMenuOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
              role="menu"
            >
              <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                <p className="truncate text-sm font-medium text-slate-900">{name ?? email}</p>
                <p className="truncate text-xs capitalize text-slate-500">{role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  setUserMenuOpen(false);
                  void onLogout();
                }}
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
