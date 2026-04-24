"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/models/User";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
};

export type SessionLocation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
} | null;

export type SessionContextValue = {
  user: SessionUser;
  location: SessionLocation;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SessionContextValue;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within the dashboard layout");
  }
  return ctx;
}
