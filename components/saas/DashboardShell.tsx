"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/saas/AppHeader";
import { AppSidebar, SIDEBAR_STORAGE_KEY } from "@/components/saas/AppSidebar";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { clearAccessToken } from "@/lib/access-token";
import { invalidateSessionMeCache } from "@/lib/fetch-session-me";

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(
      typeof window !== "undefined" &&
        localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1",
    );
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
    clearAccessToken();
    router.push("/login");
    router.refresh();
  }

  const sidebarWidth = collapsed ? "lg:pl-14" : "lg:pl-48";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
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
        className={`flex min-h-dvh flex-1 flex-col transition-[padding] duration-300 ease-out ${sidebarWidth}`}
      >
        <AppHeader
          name={userName}
          email={email}
          locationName={locationName}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={logout}
        />
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
