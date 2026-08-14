"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canViewAr } from "@/lib/permissions";
import { ArSubnav } from "@/components/ar/ar-subnav";

export default function ArLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!canViewAr(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canViewAr(user.role)) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Accounts Receivable
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Billing, invoices, payments, and collections for Mokanco partners
        </p>
      </div>
      <ArSubnav />
      {children}
    </div>
  );
}
