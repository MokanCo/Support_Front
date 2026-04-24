"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { canAccessConversationsInbox } from "@/lib/permissions";
import { AdminInboxClient } from "@/components/messages/admin-inbox-client";

export default function ConversationsPage() {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessConversationsInbox(user.role)) router.replace("/dashboard");
  }, [user.role, router]);

  if (!canAccessConversationsInbox(user.role)) return null;
  return <AdminInboxClient />;
}
