import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { QUICK_TICKET_TEMPLATES } from "@/lib/quick-ticket-templates";

export function PartnerDashboardHome() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Support center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a ticket or start from a quick template below.
        </p>
      </div>

      <Link
        href="/dashboard/tickets/new"
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <Card className="border-2 border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-white shadow-md transition duration-200 hover:border-primary-300 hover:shadow-lg">
          <CardBody className="flex flex-col gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Get started
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                Create ticket
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Open a blank form to describe your request in your own words. You will be taken to
                the new ticket page.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition group-hover:bg-primary-700">
              New ticket
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </CardBody>
        </Card>
      </Link>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Open quick ticket</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a category to open the form with details already filled in. You can edit
            everything before submitting.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_TICKET_TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={`/dashboard/tickets/new?quick=${encodeURIComponent(t.id)}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <Card className="h-full border border-slate-200/90 bg-white transition duration-200 hover:border-primary-200 hover:bg-slate-50/80 hover:shadow-md">
                  <CardBody className="flex gap-4 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-primary-100 group-hover:text-primary-700">
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 group-hover:text-primary-700">
                        {t.label}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{t.descriptionLine}</p>
                      <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600">
                        Start ticket
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
