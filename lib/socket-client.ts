"use client";

import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/access-token";
import { getSocketBaseUrl } from "@/lib/socket-url";

type MessageHandler = (payload: unknown) => void;
type NotificationHandler = (payload: unknown) => void;
type TicketUpdatedHandler = (payload: unknown) => void;
type PresenceHandler = (payload: unknown) => void;

export type JoinTicketAck = {
  ok?: boolean;
  error?: string;
  chatHeader?: unknown;
};

let socket: Socket | null = null;
let connectToken: string | null = null;
let connectionUsers = 0;
const messageHandlers = new Set<MessageHandler>();
const notificationHandlers = new Set<NotificationHandler>();
const ticketUpdatedHandlers = new Set<TicketUpdatedHandler>();
const presenceHandlers = new Set<PresenceHandler>();
const ticketJoinCounts = new Map<string, number>();

function attachSocketListeners(s: Socket) {
  s.off("message:new");
  s.off("notification:new");
  s.off("ticket:updated");
  s.off("presence:update");
  s.on("message:new", (payload: unknown) => {
    for (const h of messageHandlers) h(payload);
  });
  s.on("notification:new", (payload: unknown) => {
    for (const h of notificationHandlers) h(payload);
  });
  s.on("ticket:updated", (payload: unknown) => {
    for (const h of ticketUpdatedHandlers) h(payload);
  });
  s.on("presence:update", (payload: unknown) => {
    for (const h of presenceHandlers) h(payload);
  });
}

function getOrCreateSocket(): Socket | null {
  const base = getSocketBaseUrl();
  const token = getAccessToken();
  if (!base || !token) return null;

  if (socket && connectToken === token) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    ticketJoinCounts.clear();
  }

  const s = io(base, {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
  });
  connectToken = token;
  socket = s;
  attachSocketListeners(s);
  return s;
}

/** Keep one shared Socket.IO connection for the dashboard session. */
export function retainSharedSocket(): () => void {
  connectionUsers += 1;
  getOrCreateSocket();
  return () => {
    connectionUsers = Math.max(0, connectionUsers - 1);
    if (connectionUsers === 0 && socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      connectToken = null;
      ticketJoinCounts.clear();
    }
  };
}

export function subscribeMessageNew(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  getOrCreateSocket();
  return () => {
    messageHandlers.delete(handler);
  };
}

export function subscribeNotificationNew(handler: NotificationHandler): () => void {
  notificationHandlers.add(handler);
  getOrCreateSocket();
  return () => {
    notificationHandlers.delete(handler);
  };
}

export function subscribeTicketUpdated(handler: TicketUpdatedHandler): () => void {
  ticketUpdatedHandlers.add(handler);
  getOrCreateSocket();
  return () => {
    ticketUpdatedHandlers.delete(handler);
  };
}

export function subscribePresenceUpdate(handler: PresenceHandler): () => void {
  presenceHandlers.add(handler);
  getOrCreateSocket();
  return () => {
    presenceHandlers.delete(handler);
  };
}

export function joinTicketRoom(
  ticketId: string,
  onAck?: (ack: JoinTicketAck) => void,
): void {
  const tid = String(ticketId).trim();
  if (!tid) return;
  const s = getOrCreateSocket();
  if (!s) return;

  const prev = ticketJoinCounts.get(tid) ?? 0;
  ticketJoinCounts.set(tid, prev + 1);
  if (prev > 0) return;

  const emitJoin = () => {
    s.emit("join_ticket", { ticketId: tid }, onAck);
  };
  if (s.connected) emitJoin();
  else s.once("connect", emitJoin);
}

export function leaveTicketRoom(ticketId: string): void {
  const tid = String(ticketId).trim();
  if (!tid) return;
  const prev = ticketJoinCounts.get(tid) ?? 0;
  if (prev <= 1) {
    ticketJoinCounts.delete(tid);
    socket?.emit("leave_ticket", { ticketId: tid });
  } else {
    ticketJoinCounts.set(tid, prev - 1);
  }
}

export function isSharedSocketConnected(): boolean {
  return Boolean(socket?.connected);
}
