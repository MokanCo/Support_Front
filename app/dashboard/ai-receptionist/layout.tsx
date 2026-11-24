"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiReceptionistSubnav } from "@/components/ai-receptionist/subnav";
import { useSession } from "@/lib/session-context";
import { canViewAiReceptionist } from "@/lib/permissions";

export default function AiReceptionistLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const allowed = canViewAiReceptionist(user.role);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) return null;

  return (
    <div className="-mx-4 -mt-8 flex min-h-full flex-col lg:-mx-8">
      <AiReceptionistSubnav />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
