"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/saas/AppHeader";
import { AppSidebar, SIDEBAR_STORAGE_KEY } from "@/components/saas/AppSidebar";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { clearAccessToken } from "@/lib/access-token";
import { invalidateSessionMeCache } from "@/lib/fetch-session-me";
import { queryKeys } from "@/lib/query-keys";
import { AppDataPrefetcher } from "@/components/saas/AppDataPrefetcher";
import { PARTNER_TOUR_EXPAND_SIDEBAR_EVENT } from "@/lib/partner-product-tour";

export function DashboardShell({
  role,
  userName,
  email,
  locationName,
  children,
}: {
  role: UserRole;
  userName?: string | null;
  email: string;
  locationName?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "0") setCollapsed(false);
    else if (stored === "1") setCollapsed(true);
    else localStorage.setItem(SIDEBAR_STORAGE_KEY, "1");
  }, []);

  useEffect(() => {
    const expandForTour = () => {
      setCollapsed(false);
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, "0");
      }
    };
    window.addEventListener(PARTNER_TOUR_EXPAND_SIDEBAR_EVENT, expandForTour);
    return () => window.removeEventListener(PARTNER_TOUR_EXPAND_SIDEBAR_EVENT, expandForTour);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    invalidateSessionMeCache();
    queryClient.clear();
    clearAccessToken();
    router.push("/login");
    router.refresh();
  }

  const sidebarWidth = collapsed ? "lg:pl-14" : "lg:pl-48";

  return (
    <>
      <AppDataPrefetcher role={role} />
    <div className="dashboard-shell-root flex min-h-dvh flex-col bg-slate-100">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <AppSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={`dashboard-shell-column flex min-h-dvh flex-1 flex-col transition-[padding] duration-300 ease-out ${sidebarWidth}`}
      >
        <AppHeader
          name={userName}
          email={email}
          locationName={locationName}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={logout}
        />
        <main className="dashboard-shell-main flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
