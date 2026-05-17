"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@/lib/user-roles";
import { prefetchAppData } from "@/lib/prefetch-app-data";

/** Prefetch role-scoped API data once per session so navigation stays instant. */
export function AppDataPrefetcher({ role }: { role: UserRole }) {
  const queryClient = useQueryClient();
  const prefetchedFor = useRef<UserRole | null>(null);

  useEffect(() => {
    if (prefetchedFor.current === role) return;
    prefetchedFor.current = role;
    void prefetchAppData(queryClient, role);
  }, [queryClient, role]);

  return null;
}
