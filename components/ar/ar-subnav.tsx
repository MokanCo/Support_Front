"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";

const LINKS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard/ar", label: "Dashboard" },
  { href: "/dashboard/ar/billing-profiles", label: "Billing Profiles" },
  { href: "/dashboard/ar/products", label: "Products", adminOnly: true },
  { href: "/dashboard/ar/invoices", label: "Invoices" },
  { href: "/dashboard/ar/recurring", label: "Recurring", adminOnly: true },
  { href: "/dashboard/ar/payments", label: "Payments" },
  { href: "/dashboard/ar/credits", label: "Credits" },
  { href: "/dashboard/ar/statements", label: "Statements" },
  { href: "/dashboard/ar/import", label: "Import", adminOnly: true },
  { href: "/dashboard/ar/reports", label: "Reports" },
  { href: "/dashboard/ar/audit", label: "Audit Logs", adminOnly: true },
  { href: "/dashboard/ar/settings", label: "Settings", adminOnly: true },
];

export function ArSubnav() {
  const pathname = usePathname();
  const { user } = useSession();
  const manage = canManageAr(user.role);

  return (
    <div className="mb-6 overflow-x-auto border-b border-slate-200">
      <nav className="flex min-w-max gap-1 pb-2">
        {LINKS.filter((l) => manage || !l.adminOnly).map((link) => {
          const active =
            link.href === "/dashboard/ar"
              ? pathname === "/dashboard/ar"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-primary-50 text-primary-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
