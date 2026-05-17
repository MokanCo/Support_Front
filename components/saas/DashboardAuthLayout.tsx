"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AUTH_TOKEN_CHANGED_EVENT,
  clearAccessToken,
  getAccessToken,
} from "@/lib/access-token";
import { sessionQueryOptions } from "@/lib/queries/session";
import {
  SessionProvider,
  type SessionLocation,
  type SessionUser,
} from "@/lib/session-context";
import { DashboardShell } from "@/components/saas/DashboardShell";
import { DashboardShellSkeleton } from "@/components/ui/skeleton";
import { MessageInboxProvider } from "@/lib/message-inbox-context";
import { ForcePasswordChangeModal } from "@/components/auth/force-password-change-modal";
import { PartnerProductTour } from "@/components/onboarding/partner-product-tour";
import { shouldShowPartnerTour } from "@/lib/partner-product-tour";

export function DashboardAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [partnerTourOpen, setPartnerTourOpen] = useState(false);

  const syncTokenFromStorage = useCallback(() => {
    const token = getAccessToken();
    setHasToken(Boolean(token));
    return token;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!syncTokenFromStorage()) {
      router.replace("/login");
    }
    setTokenChecked(true);

    const onAuthChange = () => {
      if (!syncTokenFromStorage()) {
        router.replace("/login");
      }
    };
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, [router, syncTokenFromStorage]);

  const sessionQuery = useQuery({
    ...sessionQueryOptions,
    enabled: tokenChecked && hasToken,
  });

  useEffect(() => {
    if (!tokenChecked || !hasToken) return;
    if (!sessionQuery.isFetched) return;
    if (!sessionQuery.data) {
      clearAccessToken();
      router.replace("/login");
    }
  }, [tokenChecked, hasToken, sessionQuery.isFetched, sessionQuery.data, router]);

  const sessionUser = sessionQuery.data?.user;
  const sessionMustChangePassword = Boolean(sessionUser?.mustChangePassword);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "partner" || sessionMustChangePassword) {
      setPartnerTourOpen(false);
      return;
    }
    if (!shouldShowPartnerTour(sessionUser.id)) return;
    const timer = window.setTimeout(() => setPartnerTourOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [sessionUser?.id, sessionUser?.role, sessionMustChangePassword]);

  if (!tokenChecked || (hasToken && sessionQuery.isPending)) {
    return <DashboardShellSkeleton />;
  }

  const data = sessionQuery.data;
  if (!hasToken || !data) {
    return null;
  }

  const user: SessionUser = data.user;
  const location: SessionLocation = data.location ?? null;

  const mustChangePassword = Boolean(user.mustChangePassword);
  const isPartner = user.role === "partner";

  return (
    <SessionProvider value={{ user, location, isLoading: false }}>
      <MessageInboxProvider>
        <ForcePasswordChangeModal open={mustChangePassword} />
        {isPartner ? (
          <PartnerProductTour
            open={partnerTourOpen && !mustChangePassword}
            userId={user.id}
            userName={user.name}
            onComplete={() => setPartnerTourOpen(false)}
          />
        ) : null}
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
