"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/access-token";
import { normalizeApiMessageRow, type ClientMessageRow } from "@/lib/messages-client";
import { playIncomingMessageSound } from "@/lib/play-message-sound";
import { getSocketBaseUrl } from "@/lib/socket-url";

export type TicketSocketOptions = {
  /** When set, play a tone for rows not sent by this user (including system lines). */
  viewerUserId?: string | null;
  playIncomingSound?: boolean;
};

type Payload = {
  ticketId: string;
  message: unknown;
  ticket?: { title?: string; ticketCode?: string | null };
};

const RETRY_MS = 400;
const RETRY_MAX_MS = 20_000;

/**
 * Subscribes to real-time messages for a ticket via Socket.IO (backend `/socket.io`).
 * Retries until socket URL + access token are available.
 */
export function useTicketSocket(
  ticketId: string | null | undefined,
  enabled: boolean,
  onMessage: (row: ClientMessageRow) => void,
  options?: TicketSocketOptions
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const ticketIdRef = useRef(ticketId);
  ticketIdRef.current = ticketId;

  useEffect(() => {
    if (!enabled || !ticketId) return;

    let cancelled = false;
    let socket: Socket | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let stopRetry: ReturnType<typeof setTimeout> | null = null;

    const join = () => {
      const tid = ticketIdRef.current;
      if (!tid || !socket) return;
      socket.emit("join_ticket", { ticketId: tid }, (ack: { ok?: boolean; error?: string } | undefined) => {
        if (ack && ack.ok === false && ack.error) {
          // eslint-disable-next-line no-console
          console.warn("[socket] join_ticket failed:", ack.error);
        }
      });
    };

    const onNew = (payload: Payload) => {
      const tid = ticketIdRef.current;
      if (!payload || !tid || String(payload.ticketId) !== String(tid)) return;
      try {
        const row = normalizeApiMessageRow(payload.message);
        if (!row.id) return;
        onMessageRef.current(row);
        const opt = optionsRef.current;
        const viewer = opt?.viewerUserId;
        const wantSound = opt?.playIncomingSound !== false;
        if (wantSound && viewer && row.senderId && row.senderId !== viewer) {
          playIncomingMessageSound();
        }
      } catch {
        /* ignore malformed payloads */
      }
    };

    const detachSocket = () => {
      if (!socket) return;
      const tid = ticketIdRef.current;
      if (tid) socket.emit("leave_ticket", { ticketId: tid });
      socket.off("connect", join);
      socket.off("message:new", onNew);
      socket.disconnect();
      socket = null;
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
      s.on("connect", join);
      s.on("message:new", onNew);
      if (s.connected) join();

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
      detachSocket();
    };
  }, [ticketId, enabled]);
}
