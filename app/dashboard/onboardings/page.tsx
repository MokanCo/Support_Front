"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canManageOnboardings } from "@/lib/permissions";
import { OnboardingsListClient } from "@/components/onboardings/onboardings-list-client";

export default function OnboardingsPage() {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!canManageOnboardings(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canManageOnboardings(user.role)) return null;
  return <OnboardingsListClient />;
}
