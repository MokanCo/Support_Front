"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canListLocations } from "@/lib/permissions";
import { LocationDetailClient } from "@/components/locations/location-detail-client";

export default function LocationDetailPage() {
  const params = useParams();
  const locationId = params.id as string;
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    if (!canListLocations(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canListLocations(user.role)) return null;
  return <LocationDetailClient locationId={locationId} role={user.role} />;
}
