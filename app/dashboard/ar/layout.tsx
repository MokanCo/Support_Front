"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canViewAr } from "@/lib/permissions";
import { ArFilterProvider } from "@/lib/ar/filters";
import { ArToastProvider } from "@/components/ar/ui/toast";
import {
  AccountsMenuButton,
  AccountsSidebar,
} from "@/components/ar/accounts-sidebar";
import { accountsTitle } from "@/components/ar/accounts-nav";

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!canViewAr(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canViewAr(user.role)) return null;

  const { title, description } = accountsTitle(pathname);

  return (
    <ArToastProvider>
      <ArFilterProvider>
        {/*
          `.accounts-shell` pins the surrounding dashboard shell to the viewport
          (see globals.css), so this region is exactly the space below the
          header. The rail then stays put and only the content column scrolls.
        */}
        <div className="accounts-shell mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 gap-6 overflow-hidden">
          <AccountsSidebar
            role={user.role}
            drawerOpen={drawerOpen}
            onDrawerClose={closeDrawer}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 pb-4">
              <AccountsMenuButton onOpen={() => setDrawerOpen(true)} />
              <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-[26px] lg:mt-0">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>

            <div
              key={pathname}
              className="ar-scroll ar-enter min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0.5 pb-6"
            >
              {children}
            </div>
          </div>
        </div>
      </ArFilterProvider>
    </ArToastProvider>
  );
}
