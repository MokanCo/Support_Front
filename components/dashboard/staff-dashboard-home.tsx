"use client";

import type { UserRole } from "@/lib/user-roles";
import { AdminDashboardInsights } from "@/components/dashboard/admin-dashboard-insights";
import { SupportDashboardInsights } from "@/components/dashboard/support-dashboard-insights";

export function StaffDashboardHome({ role }: { role: UserRole }) {
  if (role === "admin") return <AdminDashboardInsights />;
  if (role === "support") return <SupportDashboardInsights />;
  return null;
}
