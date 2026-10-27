"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ArBillingProfilesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/ar/customers");
  }, [router]);

  return null;
}
