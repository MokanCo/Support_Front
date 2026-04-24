"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAccessToken, getAccessToken } from "@/lib/access-token";
import { fetchSessionMeOnce } from "@/lib/fetch-session-me";
import {
  SessionProvider,
  type SessionLocation,
  type SessionUser,
} from "@/lib/session-context";
import { DashboardShell } from "@/components/saas/DashboardShell";
import { MessageInboxProvider } from "@/lib/message-inbox-context";

export function DashboardAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [location, setLocation] = useState<SessionLocation>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!getAccessToken()) {
      router.replace("/login");
      setIsLoading(false);
      return;
    }

    const data = await fetchSessionMeOnce();
    if (!data) {
      clearAccessToken();
      router.replace("/login");
      setUser(null);
      setLocation(null);
      setIsLoading(false);
      return;
    }

    setUser(data.user);
    setLocation(data.location ?? null);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SessionProvider value={{ user, location, isLoading: false }}>
      <MessageInboxProvider>
        <DashboardShell
          role={user.role}
          userName={user.name}
          email={user.email}
          locationName={location?.name ?? null}
        >
          {children}
        </DashboardShell>
      </MessageInboxProvider>
    </SessionProvider>
  );
}
