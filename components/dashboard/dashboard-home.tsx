"use client";

import type { UserRole } from "@/models/User";
import { PartnerDashboardHome } from "@/components/dashboard/partner-dashboard-home";
import { StaffDashboardHome } from "@/components/dashboard/staff-dashboard-home";

export function DashboardHome({ role }: { role: UserRole }) {
  if (role === "partner") {
    return <PartnerDashboardHome />;
  }
  return <StaffDashboardHome role={role} />;
}
