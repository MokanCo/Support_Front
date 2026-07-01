"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canManageOnboardings } from "@/lib/permissions";
import { OnboardingDetailClient } from "@/components/onboardings/onboarding-detail-client";

export default function OnboardingViewPage() {
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  useEffect(() => {
    if (!canManageOnboardings(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canManageOnboardings(user.role)) return null;
  if (!id) {
    return (
      <p className="text-sm text-slate-500">Missing onboarding request id.</p>
    );
  }
  return <OnboardingDetailClient id={id} />;
}
