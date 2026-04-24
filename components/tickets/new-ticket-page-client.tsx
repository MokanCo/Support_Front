"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { UserRole } from "@/models/User";
import { getQuickTicketTemplate } from "@/lib/quick-ticket-templates";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

export function NewTicketPageClient({ role }: { role: UserRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quick = searchParams.get("quick");
  const template = getQuickTicketTemplate(quick);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader
          title={template ? `New ticket: ${template.label}` : "Create ticket"}
          description={
            template
              ? "Review the pre-filled details and submit when ready."
              : "Submit a new request to the support queue."
          }
        />
        <CardBody>
          <CreateTicketForm
            role={role}
            quickTemplateId={quick}
            showCancel
            onCancel={() => router.push("/dashboard")}
            onSuccess={(id) => router.push(`/dashboard/tickets/${id}`)}
          />
        </CardBody>
      </Card>
    </div>
  );
}
