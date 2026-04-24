"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { canListLocations } from "@/lib/permissions";
import { LocationDetailClient } from "@/components/locations/location-detail-client";

function LocationViewInner() {
  const sp = useSearchParams();
  const id = sp.get("id") ?? "";
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    if (!canListLocations(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canListLocations(user.role)) return null;

  if (!id) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Missing location id.{" "}
        <Link href="/dashboard/locations" className="text-primary-600 underline">
          Back to locations
        </Link>
      </div>
    );
  }

  return <LocationDetailClient locationId={id} role={user.role} />;
}

export default function LocationViewPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <LocationViewInner />
    </Suspense>
  );
}
