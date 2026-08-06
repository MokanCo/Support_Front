"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Hash,
  LayoutTemplate,
  Percent,
} from "lucide-react";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetchArSettings, updateArSettings } from "@/lib/queries/ar";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";

type SettingsForm = {
  invoiceNumberPrefix: string;
  defaultCurrency: string;
  defaultPaymentTermsDays: string;
  gracePeriodDays: string;
  companyName: string;
  billingEmail: string;
  supportEmail: string;
};

const emptyForm: SettingsForm = {
  invoiceNumberPrefix: "",
  defaultCurrency: "USD",
  defaultPaymentTermsDays: "30",
  gracePeriodDays: "0",
  companyName: "",
  billingEmail: "",
  supportEmail: "",
};

function toForm(data: Record<string, unknown>): SettingsForm {
  return {
    invoiceNumberPrefix: String(data.invoiceNumberPrefix ?? ""),
    defaultCurrency: String(data.defaultCurrency ?? "USD"),
    defaultPaymentTermsDays: String(data.defaultPaymentTermsDays ?? 30),
    gracePeriodDays: String(data.defaultGracePeriodDays ?? data.gracePeriodDays ?? 0),
    companyName: String(data.companyName ?? ""),
    billingEmail: String(data.billingEmail ?? ""),
    supportEmail: String(data.supportEmail ?? ""),
  };
}

function SectionIcon({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-xl ${className}`}
    >
      {children}
    </span>
  );
}

export default function ArSettingsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ar", "settings"],
    queryFn: fetchArSettings,
    enabled: manage,
  });

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateArSettings({
        invoiceNumberPrefix: form.invoiceNumberPrefix.trim() || undefined,
        defaultCurrency: form.defaultCurrency.trim() || "USD",
        defaultPaymentTermsDays: Number(form.defaultPaymentTermsDays) || 30,
        gracePeriodDays: Number(form.gracePeriodDays) || 0,
        companyName: form.companyName.trim() || undefined,
        billingEmail: form.billingEmail.trim() || undefined,
        supportEmail: form.supportEmail.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "settings"] });
      setFieldError(null);
      toast.success("Settings saved", "AR defaults updated successfully.");
    },
    onError: (e: Error) => {
      setFieldError(e.message);
      toast.error("Could not save settings", e.message);
    },
  });

  function handleSave() {
    setFieldError(null);
    saveMutation.mutate();
  }

  if (!manage) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only administrators can change AR settings."
      />
    );
  }

  if (error) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      <Panel padded={false}>
        <Link
          href="/dashboard/ar/templates"
          className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80 sm:px-6"
        >
          <div className="flex min-w-0 items-start gap-3">
            <SectionIcon className="bg-indigo-100 text-indigo-700">
              <LayoutTemplate className="h-[18px] w-[18px]" />
            </SectionIcon>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight text-slate-900">
                Invoice templates
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                Manage the template library
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
      </Panel>

      {isLoading ? (
        <Panel padded={false}>
          <PanelHeader title="Loading settings" />
          <SkeletonRows rows={8} cols={2} />
        </Panel>
      ) : (
        <>
          <Panel padded={false}>
            <PanelHeader
              title="Invoice numbering"
              description="Prefix applied to newly generated invoice numbers"
              icon={
                <SectionIcon className="bg-sky-100 text-sky-700">
                  <Hash className="h-[18px] w-[18px]" />
                </SectionIcon>
              }
            />
            <PanelBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Invoice number prefix"
                  value={form.invoiceNumberPrefix}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoiceNumberPrefix: e.target.value }))
                  }
                />
              </div>
            </PanelBody>
          </Panel>

          <Panel padded={false}>
            <PanelHeader
              title="Currency & terms"
              description="Defaults for new invoices"
              icon={
                <SectionIcon className="bg-emerald-100 text-emerald-700">
                  <CalendarClock className="h-[18px] w-[18px]" />
                </SectionIcon>
              }
            />
            <PanelBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Default currency"
                  value={form.defaultCurrency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultCurrency: e.target.value }))
                  }
                />
                <Input
                  label="Default payment terms (days)"
                  type="number"
                  min="0"
                  value={form.defaultPaymentTermsDays}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultPaymentTermsDays: e.target.value,
                    }))
                  }
                />
              </div>
            </PanelBody>
          </Panel>

          <Panel padded={false}>
            <PanelHeader
              title="Late fees & reminders"
              description="Grace window before overdue handling"
              icon={
                <SectionIcon className="bg-amber-100 text-amber-700">
                  <Percent className="h-[18px] w-[18px]" />
                </SectionIcon>
              }
            />
            <PanelBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Grace period (days)"
                  type="number"
                  min="0"
                  value={form.gracePeriodDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))
                  }
                />
              </div>
            </PanelBody>
          </Panel>

          <Panel padded={false}>
            <PanelHeader
              title="Company details"
              description="Shown on invoices and customer communications"
              icon={
                <SectionIcon className="bg-violet-100 text-violet-700">
                  <Building2 className="h-[18px] w-[18px]" />
                </SectionIcon>
              }
            />
            <PanelBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Company name"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                />
                <Input
                  label="Billing email"
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingEmail: e.target.value }))
                  }
                />
                <Input
                  label="Support email"
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supportEmail: e.target.value }))
                  }
                />
              </div>
            </PanelBody>
          </Panel>

          {fieldError ? (
            <p className="text-sm text-rose-600">{fieldError}</p>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
