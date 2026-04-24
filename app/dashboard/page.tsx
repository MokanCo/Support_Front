"use client";

import { useSession } from "@/lib/session-context";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default function DashboardPage() {
  const { user } = useSession();
  return <DashboardHome role={user.role} />;
}
