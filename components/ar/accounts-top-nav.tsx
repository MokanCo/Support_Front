"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/user-roles";
import {
  accountsNavForRole,
  isAccountsNavActive,
} from "@/components/ar/accounts-nav";

/** Horizontal Accounts nav for partners (Insights · Invoices · Reports). */
export function AccountsTopNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = accountsNavForRole(role).flatMap((g) => g.items);

  return (
    <nav
      aria-label="Accounts"
      className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isAccountsNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active ? "text-white" : "text-slate-400"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
