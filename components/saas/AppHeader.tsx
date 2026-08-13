"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { titleForPath } from "@/components/saas/nav-config";
import type { UserRole } from "@/lib/user-roles";
import {
  messageInboxPreviewText,
  useMessageInbox,
  type MessageInboxItem,
} from "@/lib/message-inbox-context";
import { useAccessToken } from "@/lib/use-access-token";
import { useStatusNotifications, type StatusNotificationRow } from "@/lib/use-status-notifications";

const READ_STORAGE_KEY = "mokanco:bellReadKeys";

function readKeysFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistReadKeys(next: Set<string>) {
  try {
    sessionStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
}

type MergedRow =
  | {
      kind: "status";
      readKey: string;
      sortAt: number;
      status: StatusNotificationRow;
    }
  | {
      kind: "message";
      readKey: string;
      sortAt: number;
      message: MessageInboxItem;
    };

type BellTab = "all" | "assigned" | "updates" | "onboardings" | "messages";

function isAssignmentNotification(s: StatusNotificationRow): boolean {
  return s.kind === "ticket_assigned";
}

function isOnboardingNotification(s: StatusNotificationRow): boolean {
  return s.kind.startsWith("onboarding");
}

function isPaymentSubmissionNotification(s: StatusNotificationRow): boolean {
  return s.entityType === "ar_payment_submission";
}

function statusToRows(items: StatusNotificationRow[]): MergedRow[] {
  return items.map((s) => ({
    kind: "status" as const,
    readKey: `s:${s.id}`,
    sortAt: new Date(s.createdAt || 0).getTime() || 0,
    status: s,
  }));
}

function messagesToRows(items: MessageInboxItem[]): MergedRow[] {
  return items.map((m) => ({
    kind: "message" as const,
    readKey: `m:${m.ticketId}`,
    sortAt: new Date(m.lastMessage.createdAt || 0).getTime() || 0,
    message: m,
  }));
}

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
  const accessToken = useAccessToken();
  const { items, headerUnreadCount, clearTicketNotification, clearAllMessageNotifications } =
    useMessageInbox();
  const { items: statusItems, load: loadStatus, dismissOne, dismissAll } =
    useStatusNotifications(Boolean(accessToken));

  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setReadKeys(readKeysFromStorage());
  }, []);

  const markRead = useCallback((key: string) => {
    setReadKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      persistReadKeys(next);
      return next;
    });
  }, []);

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
  const [bellTab, setBellTab] = useState<BellTab>(() =>
    role === "support" ? "assigned" : "all",
  );
  const bellRef = useRef<HTMLDivElement>(null);

  const hideMessageBellSection = pathname.startsWith("/dashboard/conversations");

  const assignmentStatus = useMemo(
    () => statusItems.filter(isAssignmentNotification),
    [statusItems],
  );
  const onboardingStatus = useMemo(
    () => statusItems.filter(isOnboardingNotification),
    [statusItems],
  );
  const updateStatus = useMemo(
    () => statusItems.filter((s) => !isAssignmentNotification(s) && !isOnboardingNotification(s)),
    [statusItems],
  );

  const messageDropdownItems = hideMessageBellSection
    ? []
    : items.filter((i) => i.highlight).length > 0
      ? items.filter((i) => i.highlight)
      : items.slice(0, 12);

  const mergedRows = useMemo((): MergedRow[] => {
    const out: MergedRow[] = [
      ...statusToRows(statusItems),
      ...messagesToRows(messageDropdownItems),
    ];
    out.sort((a, b) => b.sortAt - a.sortAt);
    return out;
  }, [statusItems, messageDropdownItems]);

  const visibleRows = useMemo((): MergedRow[] => {
    let rows: MergedRow[];
    if (bellTab === "assigned") rows = statusToRows(assignmentStatus);
    else if (bellTab === "updates") rows = statusToRows(updateStatus);
    else if (bellTab === "onboardings") rows = statusToRows(onboardingStatus);
    else if (bellTab === "messages") rows = messagesToRows(messageDropdownItems);
    else rows = mergedRows;
    return [...rows].sort((a, b) => b.sortAt - a.sortAt);
  }, [
    bellTab,
    assignmentStatus,
    updateStatus,
    onboardingStatus,
    messageDropdownItems,
    mergedRows,
  ]);

  const unreadAssignedCount = useMemo(
    () => assignmentStatus.filter((s) => !readKeys.has(`s:${s.id}`)).length,
    [assignmentStatus, readKeys],
  );

  const unreadUpdatesCount = useMemo(
    () => updateStatus.filter((s) => !readKeys.has(`s:${s.id}`)).length,
    [updateStatus, readKeys],
  );

  const unreadOnboardingCount = useMemo(
    () => onboardingStatus.filter((s) => !readKeys.has(`s:${s.id}`)).length,
    [onboardingStatus, readKeys],
  );

  const showAssignedTab = role === "support" || assignmentStatus.length > 0;
  const showUpdatesTab = updateStatus.length > 0 || role !== "support";
  const showOnboardingsTab = (role === "admin" || role === "support") && onboardingStatus.length > 0;
  const showMessagesTab = !hideMessageBellSection && messageDropdownItems.length > 0;

  const unreadStatusCount = useMemo(
    () => statusItems.filter((s) => !readKeys.has(`s:${s.id}`)).length,
    [statusItems, readKeys]
  );

  const totalBellCount = headerUnreadCount + unreadStatusCount;

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

  useEffect(() => {
    if (bellOpen) void loadStatus();
  }, [bellOpen, loadStatus]);

  const goToTicketDetail = useCallback(
    (ticketId: string, opts?: { openChat?: boolean }) => {
      const params = new URLSearchParams({ id: ticketId });
      if (opts?.openChat) params.set("chat", "1");
      router.push(`/dashboard/tickets/view?${params.toString()}`);
    },
    [router],
  );

  const goToTicketFromBell = useCallback(
    (ticketId: string) => {
      if (role === "admin" || role === "support") {
        router.push(`/dashboard/conversations?ticket=${encodeURIComponent(ticketId)}`);
        return;
      }
      goToTicketDetail(ticketId);
    },
    [role, router, goToTicketDetail],
  );

  const onSelectInboxItem = useCallback(
    (item: MessageInboxItem) => {
      markRead(`m:${item.ticketId}`);
      clearTicketNotification(item.ticketId);
      setBellOpen(false);
      if (role === "admin" || role === "support") {
        router.push(
          `/dashboard/conversations?ticket=${encodeURIComponent(item.ticketId)}`
        );
        return;
      }
      router.push(
        `/dashboard/tickets/view?id=${encodeURIComponent(item.ticketId)}&chat=1`
      );
    },
    [clearTicketNotification, markRead, role, router]
  );

  const onStatusNotificationClick = useCallback(
    (s: StatusNotificationRow) => {
      markRead(`s:${s.id}`);
      setBellOpen(false);
      if (isOnboardingNotification(s)) {
        if (s.ticketId) router.push(`/dashboard/onboardings/view?id=${s.ticketId}`);
        else router.push("/dashboard/onboardings");
        return;
      }
      if (isPaymentSubmissionNotification(s)) {
        router.push("/dashboard/ar/payments");
        return;
      }
      if (!s.ticketId) return;
      if (isAssignmentNotification(s) || s.kind === "ticket_completed") {
        goToTicketDetail(s.ticketId);
        return;
      }
      goToTicketFromBell(s.ticketId);
    },
    [markRead, router, goToTicketDetail, goToTicketFromBell],
  );

  const onDismissStatus = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      await dismissOne(id);
    },
    [dismissOne]
  );

  const onClearAllNotifications = useCallback(async () => {
    await dismissAll();
    clearAllMessageNotifications();
    setReadKeys(new Set());
    persistReadKeys(new Set());
  }, [dismissAll, clearAllMessageNotifications]);

  const bellAria =
    totalBellCount > 0
      ? `${totalBellCount} unread notification${totalBellCount === 1 ? "" : "s"}`
      : "Notifications";

  function rowVisual(
    entry: MergedRow
  ): { muted: boolean; boxClass: string; label: string } {
    const read = readKeys.has(entry.readKey);
    if (entry.kind === "status") {
      const s = entry.status;
      const isNewTicket = s.kind === "ticket_created";
      const isAssigned = isAssignmentNotification(s);
      const isOnboarding = isOnboardingNotification(s);
      const isPaymentSubmission = isPaymentSubmissionNotification(s);
      const label = isAssigned
        ? "Assigned to you"
        : isOnboarding
          ? "New Onboarding"
          : isPaymentSubmission
            ? "Payment to verify"
            : isNewTicket
              ? "New ticket"
              : s.kind === "ticket_completed"
                ? "Completed"
                : "Update";
      if (read) {
        return {
          muted: true,
          label,
          boxClass:
            "border-slate-100 bg-slate-50/95 opacity-[0.72] ring-0 shadow-sm hover:brightness-[0.98]",
        };
      }
      const boxClass = isOnboarding
        ? "border-orange-200/90 bg-orange-50/90 ring-2 ring-orange-200/50 ring-offset-1 ring-offset-white shadow-sm hover:brightness-[0.98]"
        : isAssigned
          ? "border-violet-200/90 bg-violet-50/90 ring-2 ring-violet-200/50 ring-offset-1 ring-offset-white shadow-sm hover:brightness-[0.98]"
          : isNewTicket
            ? "border-sky-200/90 bg-sky-50/90 ring-2 ring-sky-200/50 ring-offset-1 ring-offset-white shadow-sm hover:brightness-[0.98]"
            : s.kind === "ticket_completed"
              ? "border-emerald-200/90 bg-emerald-50/90 ring-2 ring-emerald-200/50 ring-offset-1 ring-offset-white shadow-sm hover:brightness-[0.98]"
              : "border-amber-200/90 bg-amber-50/90 ring-2 ring-amber-200/50 ring-offset-1 ring-offset-white shadow-sm hover:brightness-[0.98]";
      return { muted: false, label, boxClass };
    }
    if (read) {
      return {
        muted: true,
        label: "Message",
        boxClass:
          "border-slate-100 bg-slate-50/95 opacity-[0.72] ring-0 shadow-sm hover:brightness-[0.98]",
      };
    }
    if (entry.message.highlight) {
      return {
        muted: false,
        label: "Message",
        boxClass:
          "border-primary-200 bg-primary-50 ring-2 ring-primary-200/60 ring-offset-1 ring-offset-white shadow-sm hover:brightness-[0.98]",
      };
    }
    return {
      muted: false,
      label: "Message",
      boxClass:
        "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:bg-slate-50 hover:brightness-[0.98]",
    };
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
            Workspace
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {locationName ? `${locationName}` : null}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((o) => !o)}
            data-tour={role === "partner" ? "partner-notifications" : undefined}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-label={bellAria}
            aria-expanded={bellOpen}
          >
            <Bell className="h-[18px] w-[18px]" />
            {totalBellCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
                {totalBellCount > 99 ? "99+" : totalBellCount}
              </span>
            ) : null}
          </button>

          {bellOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,380px)] max-h-[min(70vh,480px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg ring-1 ring-slate-900/5"
              role="menu"
            >
              <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notifications
                </p>
                {statusItems.length > 0 || messageDropdownItems.length > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                    onClick={() => void onClearAllNotifications()}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>

              <div
                className="flex flex-wrap gap-1 px-3 pb-2"
                role="tablist"
                aria-label="Notification categories"
              >
                {showAssignedTab ? (
                  <BellTabButton
                    active={bellTab === "assigned"}
                    label="Assigned"
                    unread={unreadAssignedCount}
                    onClick={() => setBellTab("assigned")}
                  />
                ) : null}
                {showUpdatesTab ? (
                  <BellTabButton
                    active={bellTab === "updates"}
                    label="Updates"
                    unread={unreadUpdatesCount}
                    onClick={() => setBellTab("updates")}
                  />
                ) : null}
                {showOnboardingsTab ? (
                  <BellTabButton
                    active={bellTab === "onboardings"}
                    label="Onboardings"
                    unread={unreadOnboardingCount}
                    onClick={() => setBellTab("onboardings")}
                  />
                ) : null}
                {showMessagesTab ? (
                  <BellTabButton
                    active={bellTab === "messages"}
                    label="Messages"
                    unread={headerUnreadCount}
                    onClick={() => setBellTab("messages")}
                  />
                ) : null}
                <BellTabButton
                  active={bellTab === "all"}
                  label="All"
                  unread={totalBellCount}
                  onClick={() => setBellTab("all")}
                />
              </div>

              {visibleRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">
                  {bellTab === "assigned"
                    ? "No ticket assignments yet."
                    : bellTab === "messages" && hideMessageBellSection
                      ? "Message alerts are hidden while you are on Messages."
                      : "No notifications in this tab."}
                </p>
              ) : (
                <ul className="flex flex-col gap-2 px-3 pb-2">
                  {visibleRows.map((entry) => {
                    const v = rowVisual(entry);
                    if (entry.kind === "status") {
                      const s = entry.status;
                      return (
                        <li key={`s-${s.id}`} className="relative">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => onStatusNotificationClick(s)}
                            className={`w-full rounded-xl border py-2.5 pl-3 pr-10 text-left text-sm shadow-sm transition hover:brightness-[0.98] ${v.boxClass}`}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {v.label}
                            </p>
                            <p className="font-medium text-slate-900">{s.title}</p>
                            <p className="mt-0.5 line-clamp-3 text-xs text-slate-700">{s.body}</p>
                          </button>
                          <button
                            type="button"
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/90 hover:text-slate-800"
                            aria-label="Dismiss update"
                            onClick={(e) => void onDismissStatus(e, s.id)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    }
                    const m = entry.message;
                    return (
                      <li key={`m-${m.ticketId}`}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => onSelectInboxItem(m)}
                          className={`w-full rounded-xl border px-3 py-3 text-left text-sm shadow-sm transition hover:brightness-[0.98] ${v.boxClass}`}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {v.label}
                          </p>
                          <p className="font-medium text-slate-900">
                            {m.ticketCode ? (
                              <span className="text-primary-700">{m.ticketCode}</span>
                            ) : null}
                            {m.ticketCode ? " · " : null}
                            {m.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                            {messageInboxPreviewText(m)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
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
              <p className="truncate text-sm font-medium text-slate-900">
                {name ?? email}
              </p>
              <p className="truncate text-xs capitalize text-slate-500">
                {role}
              </p>
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
                <p className="truncate text-sm font-medium text-slate-900">
                  {name ?? email}
                </p>
                <p className="truncate text-xs capitalize text-slate-500">
                  {role}
                </p>
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

function BellTabButton({
  active,
  label,
  unread,
  onClick,
}: {
  active: boolean;
  label: string;
  unread: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "bg-primary-100 text-primary-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
      {unread > 0 ? (
        <span
          className={`inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
            active ? "bg-primary-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}
