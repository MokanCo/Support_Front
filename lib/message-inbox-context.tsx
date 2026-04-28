"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizeApiMessageRow, type ClientMessageRow } from "@/lib/messages-client";
import { playIncomingMessageSound } from "@/lib/play-message-sound";
import { getSocketBaseUrl } from "@/lib/socket-url";
import { useUserInboxSocket, type UserInboxSocketPayload } from "@/lib/use-user-inbox-socket";
import { useSession } from "@/lib/session-context";

export type MessageInboxItem = {
  ticketId: string;
  title: string;
  ticketCode: string | null;
  lastMessage: ClientMessageRow;
  highlight: boolean;
  updatedAt: number;
};

type MessageInboxContextValue = {
  items: MessageInboxItem[];
  headerUnreadCount: number;
  setFabOpenTicketId: (ticketId: string | null) => void;
  setAdminInlineTicketId: (ticketId: string | null) => void;
  setConversationsSelectedTicketId: (ticketId: string | null) => void;
  clearTicketNotification: (ticketId: string) => void;
  getLiveBump: (ticketId: string) => number;
};

const MessageInboxContext = createContext<MessageInboxContextValue | null>(null);

type SearchLike = { get: (name: string) => string | null };

/** Ticket id from URL when user is on ticket detail (`/dashboard/tickets/view?id=…` or dynamic segment). */
export function resolveDashboardTicketIdFromRoute(
  pathname: string,
  searchParams: SearchLike
): string | null {
  if (pathname === "/dashboard/tickets/view") {
    const id = searchParams.get("id")?.trim();
    return id || null;
  }
  const m = /^\/dashboard\/tickets\/([^/]+)$/.exec(pathname);
  if (m?.[1] && m[1] !== "view" && m[1] !== "new") {
    return m[1];
  }
  return null;
}

function MessageInboxProviderCore({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams: SearchLike;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const pathnameRef = useRef(pathname);
  const searchParamsRef = useRef(searchParams);
  const viewerIdRef = useRef(user.id);
  const fabOpenRef = useRef<string | null>(null);
  const adminInlineRef = useRef<string | null>(null);
  const conversationsRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
    searchParamsRef.current = searchParams;
  }, [pathname, searchParams]);
  useEffect(() => {
    viewerIdRef.current = user.id;
  }, [user.id]);

  const setFabOpenTicketId = useCallback((ticketId: string | null) => {
    fabOpenRef.current = ticketId;
  }, []);

  const setAdminInlineTicketId = useCallback((ticketId: string | null) => {
    adminInlineRef.current = ticketId;
  }, []);

  const [conversationsSelectedTicketId, setConversationsTicketState] = useState<string | null>(
    null
  );

  const setConversationsSelectedTicketId = useCallback((ticketId: string | null) => {
    conversationsRef.current = ticketId;
    setConversationsTicketState(ticketId);
  }, []);

  const [itemsMap, setItemsMap] = useState<Record<string, MessageInboxItem>>({});
  const [liveBumps, setLiveBumps] = useState<Record<string, number>>({});
  const [listEpoch, setListEpoch] = useState(0);

  const onInboxPayload = useCallback((payload: UserInboxSocketPayload) => {
    const row = normalizeApiMessageRow(payload.message);
    if (!row.id) return;
    if (row.senderId && row.senderId === viewerIdRef.current) return;

    const ticketId = String(payload.ticketId);
    const title =
      (payload.ticket?.title && String(payload.ticket.title).trim()) || "Ticket";
    const ticketCode =
      payload.ticket?.ticketCode != null ? String(payload.ticket.ticketCode) : null;

    const path = pathnameRef.current;
    const sp = searchParamsRef.current;
    const ticketOnPage = resolveDashboardTicketIdFromRoute(path, sp);
    const onConversations = path.startsWith("/dashboard/conversations");

    const suppressedForChrome =
      (ticketOnPage === ticketId &&
        (fabOpenRef.current === ticketId || adminInlineRef.current === ticketId)) ||
      (onConversations && conversationsRef.current === ticketId);

    setItemsMap((prev) => {
      const next: MessageInboxItem = {
        ticketId,
        title,
        ticketCode,
        lastMessage: row,
        highlight: !suppressedForChrome,
        updatedAt: Date.now(),
      };
      return { ...prev, [ticketId]: { ...prev[ticketId], ...next } };
    });

    if (!suppressedForChrome) {
      setLiveBumps((b) => ({
        ...b,
        [ticketId]: (b[ticketId] ?? 0) + 1,
      }));
    }

    setListEpoch((e) => e + 1);

    if (!suppressedForChrome) {
      playIncomingMessageSound();
    }
  }, []);

  const warnedNoSocketUrl = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || warnedNoSocketUrl.current) return;
    if (!getSocketBaseUrl()) {
      warnedNoSocketUrl.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[mokanco] Bell notifications need a socket URL. Set BACKEND_API_URL or NEXT_PUBLIC_SOCKET_URL in .env.local, then restart `next dev`."
      );
    }
  }, []);

  useUserInboxSocket(true, onInboxPayload);

  const clearTicketNotification = useCallback((ticketId: string) => {
    setItemsMap((prev) => {
      if (!prev[ticketId]) return prev;
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
    setLiveBumps((b) => {
      const next = { ...b };
      delete next[ticketId];
      return next;
    });
  }, []);

  const items = useMemo(
    () => Object.values(itemsMap).sort((a, b) => b.updatedAt - a.updatedAt),
    [itemsMap, listEpoch]
  );

  const headerUnreadCount = useMemo(() => {
    const ticketOnPage = resolveDashboardTicketIdFromRoute(pathname, searchParams);
    const onConversations = pathname.startsWith("/dashboard/conversations");

    let sum = 0;
    for (const item of Object.values(itemsMap)) {
      if (!item.highlight) continue;
      if (ticketOnPage && item.ticketId === ticketOnPage) continue;
      if (onConversations && item.ticketId === conversationsSelectedTicketId) continue;
      sum += Math.max(1, liveBumps[item.ticketId] ?? 1);
    }
    return sum;
  }, [
    itemsMap,
    pathname,
    searchParams,
    conversationsSelectedTicketId,
    listEpoch,
    liveBumps,
  ]);

  const getLiveBump = useCallback(
    (ticketId: string) => liveBumps[ticketId] ?? 0,
    [liveBumps]
  );

  const value = useMemo(
    () => ({
      items,
      headerUnreadCount,
      setFabOpenTicketId,
      setAdminInlineTicketId,
      setConversationsSelectedTicketId,
      clearTicketNotification,
      getLiveBump,
    }),
    [
      items,
      headerUnreadCount,
      setFabOpenTicketId,
      setAdminInlineTicketId,
      setConversationsSelectedTicketId,
      clearTicketNotification,
      getLiveBump,
    ]
  );

  return (
    <MessageInboxContext.Provider value={value}>{children}</MessageInboxContext.Provider>
  );
}

function MessageInboxProviderWithSearch({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  return (
    <MessageInboxProviderCore searchParams={searchParams}>{children}</MessageInboxProviderCore>
  );
}

export function MessageInboxProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <MessageInboxProviderCore searchParams={new URLSearchParams()}>
          {children}
        </MessageInboxProviderCore>
      }
    >
      <MessageInboxProviderWithSearch>{children}</MessageInboxProviderWithSearch>
    </Suspense>
  );
}

export function useMessageInbox(): MessageInboxContextValue {
  const ctx = useContext(MessageInboxContext);
  if (!ctx) {
    throw new Error("useMessageInbox must be used within MessageInboxProvider");
  }
  return ctx;
}

export function messageInboxPreviewText(item: MessageInboxItem): string {
  const raw = item.lastMessage.text ?? "";
  return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
}
