"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canAccessTicketReports } from "@/lib/permissions";
import { ReportsClient } from "./reports-client";

export default function ReportsPage() {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessTicketReports(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canAccessTicketReports(user.role)) return null;
  return <ReportsClient />;
}
