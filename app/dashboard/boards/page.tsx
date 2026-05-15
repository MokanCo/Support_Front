"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { BoardsPageClient } from "@/components/boards/boards-page-client";

export default function BoardsPage() {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (user.role === "partner") router.replace("/dashboard");
  }, [user.role, router]);

  if (user.role === "partner") return null;
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading boards…</p>}>
      <BoardsPageClient />
    </Suspense>
  );
}
