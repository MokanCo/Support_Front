"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/access-token";
import { getSocketBaseUrl } from "@/lib/socket-url";

export type UserInboxSocketPayload = {
  ticketId: string;
  message: unknown;
  ticket?: { title?: string; ticketCode?: string | null };
};

const RETRY_MS = 400;
const RETRY_MAX_MS = 20_000;

/**
 * Subscribes to `message:new` delivered to the signed-in user (backend `user:{userId}` room).
 * Retries until `NEXT_PUBLIC_SOCKET_URL` + access token are available (handles post-login timing).
 */
export function useUserInboxSocket(
  enabled: boolean,
  onPayload: (p: UserInboxSocketPayload) => void
): void {
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let socket: Socket | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let stopRetry: ReturnType<typeof setTimeout> | null = null;

    const cleanupSocket = () => {
      if (socket) {
        socket.off("message:new", onNew);
        socket.disconnect();
        socket = null;
      }
    };

    const onNew = (payload: UserInboxSocketPayload) => {
      if (!payload?.ticketId) return;
      onPayloadRef.current(payload);
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
      s.on("message:new", onNew);

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
}
