"use client";

import { useEffect, useRef } from "react";
import { normalizeApiMessageRow, type ClientMessageRow } from "@/lib/messages-client";
import { playIncomingMessageSound } from "@/lib/play-message-sound";
import { joinTicketRoom, leaveTicketRoom, subscribeMessageNew } from "@/lib/socket-client";

export type TicketSocketOptions = {
  viewerUserId?: string | null;
  playIncomingSound?: boolean;
};

type Payload = {
  ticketId: string;
  message: unknown;
  ticket?: { title?: string; ticketCode?: string | null };
};

/**
 * Real-time messages for one ticket via the shared Socket.IO connection.
 */
export function useTicketSocket(
  ticketId: string | null | undefined,
  enabled: boolean,
  onMessage: (row: ClientMessageRow) => void,
  options?: TicketSocketOptions,
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const ticketIdRef = useRef(ticketId);
  ticketIdRef.current = ticketId;

  useEffect(() => {
    if (!enabled || !ticketId) return;

    const tid = String(ticketId);
    joinTicketRoom(tid, (ack) => {
      if (ack && ack.ok === false && ack.error) {
        // eslint-disable-next-line no-console
        console.warn("[socket] join_ticket failed:", ack.error);
      }
    });

    const unsub = subscribeMessageNew((raw) => {
      const payload = raw as Payload;
      if (!payload?.ticketId || String(payload.ticketId) !== tid) return;
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
    });

    return () => {
      unsub();
      leaveTicketRoom(tid);
    };
  }, [ticketId, enabled]);
}
