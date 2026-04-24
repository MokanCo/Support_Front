import { DashboardAuthLayout } from "@/components/saas/DashboardAuthLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAuthLayout>{children}</DashboardAuthLayout>;
}
