"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { apiFetch } from "@/lib/auth-fetch";
import { statusNotificationsQueryOptions } from "@/lib/queries/notifications";
import { getAccessToken } from "@/lib/access-token";
import { getSocketBaseUrl } from "@/lib/socket-url";

export type StatusNotificationRow = {
  id: string;
  channel: string;
  kind: string;
  ticketId: string | null;
  title: string;
  body: string;
  createdAt: string;
};

export function parseStatusNotificationsList(data: unknown): StatusNotificationRow[] {
  if (!data || typeof data !== "object") return [];
  const n = (data as { notifications?: unknown }).notifications;
  if (!Array.isArray(n)) return [];
  return n
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return {
        id,
        channel: o.channel != null ? String(o.channel) : "status",
        kind: o.kind != null ? String(o.kind) : "",
        ticketId: o.ticketId != null ? String(o.ticketId) : null,
        title: o.title != null ? String(o.title) : "",
        body: o.body != null ? String(o.body) : "",
        createdAt: normalizeIso(o.createdAt),
      } satisfies StatusNotificationRow;
    })
    .filter(Boolean) as StatusNotificationRow[];
}

function normalizeIso(v: unknown): string {
  try {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string" || typeof v === "number") return new Date(v).toISOString();
    if (v != null) return new Date(String(v)).toISOString();
  } catch {
    /* ignore */
  }
  return "";
}

/** Socket envelope: `{ notification: { ... } }` or a bare notification object. */
export function parseNotificationSocketPayload(raw: unknown): StatusNotificationRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const n =
    o.notification && typeof o.notification === "object"
      ? (o.notification as Record<string, unknown>)
      : o;
  const id = n.id != null ? String(n.id) : "";
  if (!id) return null;
  const channel = n.channel != null ? String(n.channel) : "status";
  if (channel !== "status") return null;
  return {
    id,
    channel,
    kind: n.kind != null ? String(n.kind) : "",
    ticketId: n.ticketId != null ? String(n.ticketId) : null,
    title: n.title != null ? String(n.title) : "",
    body: n.body != null ? String(n.body) : "",
    createdAt: normalizeIso(n.createdAt),
  };
}

const RETRY_MS = 400;
const RETRY_MAX_MS = 20_000;

/**
 * Persisted `channel=status` notifications + live `notification:new` on the user socket.
 */
export function useStatusNotifications(enabled: boolean) {
  const queryClient = useQueryClient();
  const mergeRef = useRef<(row: StatusNotificationRow) => void>(() => {});

  const { data: items = [], isPending: loading, refetch } = useQuery({
    ...statusNotificationsQueryOptions,
    enabled,
    refetchInterval: enabled ? 45_000 : false,
    refetchIntervalInBackground: false,
  });

  const mergeIncoming = useCallback(
    (row: StatusNotificationRow) => {
      queryClient.setQueryData<StatusNotificationRow[]>(
        statusNotificationsQueryOptions.queryKey,
        (prev) => {
          const list = prev ?? [];
          if (list.some((x) => x.id === row.id)) return list;
          return [row, ...list].sort((a, b) => {
            const ta = new Date(a.createdAt || 0).getTime();
            const tb = new Date(b.createdAt || 0).getTime();
            return tb - ta;
          });
        },
      );
    },
    [queryClient],
  );

  mergeRef.current = mergeIncoming;

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let socket: Socket | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let stopRetry: ReturnType<typeof setTimeout> | null = null;

    const cleanupSocket = () => {
      if (socket) {
        socket.off("notification:new", onNotif);
        socket.disconnect();
        socket = null;
      }
    };

    const onNotif = (payload: unknown) => {
      const row = parseNotificationSocketPayload(payload);
      if (row) mergeRef.current(row);
    };

    function tryConnect(): boolean {
      if (cancelled) return false;
      if (socket) return true;
      const base = getSocketBaseUrl();
      const token = getAccessToken();
      if (!base || !token) return false;

      const s: Socket = io(base, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
      });
      socket = s;
      s.on("notification:new", onNotif);

      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
      if (stopRetry) {
        clearTimeout(stopRetry);
        stopRetry = null;
      }
      return true;
    }

    if (!tryConnect()) {
      retryTimer = setInterval(() => {
        if (cancelled) return;
        tryConnect();
      }, RETRY_MS);
      stopRetry = setTimeout(() => {
        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, RETRY_MAX_MS);
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearInterval(retryTimer);
      if (stopRetry) clearTimeout(stopRetry);
      cleanupSocket();
    };
  }, [enabled]);

  const dismissOne = useCallback(
    async (notificationId: string) => {
      const res = await apiFetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "status", notificationId }),
      });
      if (res.ok) {
        queryClient.setQueryData<StatusNotificationRow[]>(
          statusNotificationsQueryOptions.queryKey,
          (prev) => (prev ?? []).filter((x) => x.id !== notificationId),
        );
      }
    },
    [queryClient],
  );

  const dismissAll = useCallback(async () => {
    const res = await apiFetch("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "status", clearAll: true }),
    });
    if (res.ok) {
      queryClient.setQueryData<StatusNotificationRow[]>(
        statusNotificationsQueryOptions.queryKey,
        [],
      );
    }
  }, [queryClient]);

  const count = useMemo(() => items.length, [items]);

  return { items, loading, count, load: refetch, dismissOne, dismissAll };
}
