export const queryKeys = {
  session: {
    me: () => ["session", "me"] as const,
  },
  notifications: {
    status: () => ["notifications", "status"] as const,
  },
  messages: {
    summary: (ticketId: string) => ["messages", "summary", ticketId] as const,
  },
} as const;
