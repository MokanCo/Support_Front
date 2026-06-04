"use client";

import { useEffect, useRef } from "react";
import { retainSharedSocket, subscribeMessageNew } from "@/lib/socket-client";

export type UserInboxSocketPayload = {
  ticketId: string;
  message: unknown;
  ticket?: { title?: string; ticketCode?: string | null };
};

/**
 * User-room `message:new` events via the shared Socket.IO connection.
 */
export function useUserInboxSocket(
  enabled: boolean,
  onPayload: (p: UserInboxSocketPayload) => void,
): void {
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;
    const release = retainSharedSocket();
    const unsub = subscribeMessageNew((raw) => {
      const payload = raw as UserInboxSocketPayload;
      if (!payload?.ticketId) return;
      onPayloadRef.current(payload);
    });
    return () => {
      unsub();
      release();
    };
  }, [enabled]);
}
