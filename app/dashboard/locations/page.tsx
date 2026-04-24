"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canListLocations } from "@/lib/permissions";
import { LocationsPageClient } from "@/components/locations/locations-page-client";

export default function LocationsPage() {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!canListLocations(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canListLocations(user.role)) return null;
  return <LocationsPageClient role={user.role} />;
}
