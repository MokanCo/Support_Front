"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { UserRole } from "@/lib/user-roles";
import { getQuickTicketTemplate } from "@/lib/quick-ticket-templates";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

export function NewTicketPageClient({ role }: { role: UserRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quick = searchParams.get("quick");
  const template = getQuickTicketTemplate(quick);
  const TemplateIcon = template?.icon;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader
            title={template ? `New ticket: ${template.label}` : "Create ticket"}
            description={
              template
                ? "Review the pre-filled details and submit when ready."
                : "Submit a new request to the ticket queue."
            }
          />
          <CardBody>
            <CreateTicketForm
              role={role}
              quickTemplateId={quick}
              showCancel
              onCancel={() => router.push("/dashboard")}
              onSuccess={(id) =>
                router.push(`/dashboard/tickets/view?id=${encodeURIComponent(id)}`)
              }
            />
          </CardBody>
        </Card>

        <div className="hidden lg:block">
          <Card>
            <CardBody className="space-y-4">
              {template && TemplateIcon ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                      <TemplateIcon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{template.label}</p>
                      <p className="text-xs text-slate-500">{template.descriptionLine}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      What to include
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{template.body}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Tips
                  </p>
                  <ul className="space-y-2.5 text-sm text-slate-600">
                    <li>Use a clear, specific title so the team can triage quickly.</li>
                    <li>Include steps to reproduce or context for the issue.</li>
                    <li>Paste error messages or describe expected vs. actual behaviour.</li>
                    <li>
                      Set priority accurately — Urgent is reserved for production-down incidents.
                    </li>
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
