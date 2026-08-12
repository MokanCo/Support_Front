"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CreditCard,
  Hash,
  LayoutTemplate,
  Percent,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { fetchArSettings, updateArSettings } from "@/lib/queries/ar";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";

type PaymentMethodType = "zelle" | "wire" | "ach" | "check" | "card" | "cash" | "other";

const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "zelle", label: "Zelle" },
  { value: "wire", label: "Wire Transfer" },
  { value: "ach", label: "ACH / Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

type PaymentMethodForm = {
  id?: string;
  type: PaymentMethodType;
  label: string;
  details: string;
  recipientEmail: string;
  recipientPhone: string;
  qrCodeUrl: string;
  enabled: boolean;
};

type SettingsForm = {
  invoiceNumberPrefix: string;
  defaultCurrency: string;
  defaultPaymentTermsDays: string;
  gracePeriodDays: string;
  companyName: string;
  billingEmail: string;
  supportEmail: string;
  paymentMethods: PaymentMethodForm[];
};

const emptyForm: SettingsForm = {
  invoiceNumberPrefix: "",
  defaultCurrency: "USD",
  defaultPaymentTermsDays: "30",
  gracePeriodDays: "0",
  companyName: "",
  billingEmail: "",
  supportEmail: "",
  paymentMethods: [],
};

function toForm(data: Record<string, unknown>): SettingsForm {
  const rawMethods = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
  return {
    invoiceNumberPrefix: String(data.invoiceNumberPrefix ?? ""),
    defaultCurrency: String(data.defaultCurrency ?? "USD"),
    defaultPaymentTermsDays: String(data.defaultPaymentTermsDays ?? 30),
    gracePeriodDays: String(data.defaultGracePeriodDays ?? data.gracePeriodDays ?? 0),
    companyName: String(data.companyName ?? ""),
    billingEmail: String(data.billingEmail ?? ""),
    supportEmail: String(data.supportEmail ?? ""),
    paymentMethods: rawMethods.map((m) => {
      const raw = m as Record<string, unknown>;
      return {
        id: raw.id ? String(raw.id) : undefined,
        type: (raw.type as PaymentMethodType) ?? "other",
        label: String(raw.label ?? ""),
        details: String(raw.details ?? ""),
        recipientEmail: String(raw.recipientEmail ?? ""),
        recipientPhone: String(raw.recipientPhone ?? ""),
        qrCodeUrl: String(raw.qrCodeUrl ?? ""),
        enabled: raw.enabled !== false,
      };
    }),
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
        paymentMethods: form.paymentMethods
          .filter((m) => m.label.trim())
          .map((m) => ({
            type: m.type,
            label: m.label.trim(),
            details: m.details.trim(),
            recipientEmail: m.recipientEmail.trim(),
            recipientPhone: m.recipientPhone.trim(),
            qrCodeUrl: m.qrCodeUrl.trim(),
            enabled: m.enabled,
          })),
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

  function addPaymentMethod() {
    setForm((f) => ({
      ...f,
      paymentMethods: [
        ...f.paymentMethods,
        {
          type: "zelle",
          label: "",
          details: "",
          recipientEmail: "",
          recipientPhone: "",
          qrCodeUrl: "",
          enabled: true,
        },
      ],
    }));
  }

  function updatePaymentMethod(index: number, patch: Partial<PaymentMethodForm>) {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function removePaymentMethod(index: number) {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.filter((_, i) => i !== index),
    }));
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

          <Panel padded={false}>
            <PanelHeader
              title="Payment methods"
              description="Shown on invoice, reminder, and overdue emails so customers know how to pay"
              icon={
                <SectionIcon className="bg-teal-100 text-teal-700">
                  <CreditCard className="h-[18px] w-[18px]" />
                </SectionIcon>
              }
              action={
                <Button size="sm" variant="secondary" onClick={addPaymentMethod}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add method
                </Button>
              }
            />
            <PanelBody>
              {form.paymentMethods.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No payment methods configured yet. Add one so it appears on outgoing invoice emails.
                </p>
              ) : (
                <div className="space-y-4">
                  {form.paymentMethods.map((method, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
                        <Select
                          label="Type"
                          value={method.type}
                          onChange={(e) =>
                            updatePaymentMethod(index, {
                              type: e.target.value as PaymentMethodType,
                            })
                          }
                        >
                          {PAYMENT_METHOD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                        <Input
                          label="Label shown to customers"
                          value={method.label}
                          onChange={(e) =>
                            updatePaymentMethod(index, { label: e.target.value })
                          }
                          placeholder="e.g. Zelle"
                        />
                      </div>
                      <div className="mt-3">
                        <Textarea
                          label="Instructions / details"
                          value={method.details}
                          onChange={(e) =>
                            updatePaymentMethod(index, { details: e.target.value })
                          }
                          placeholder="e.g. Send to accounting@mokanco.com"
                        />
                      </div>
                      {method.type === "zelle" ? (
                        <div className="mt-3 space-y-3 rounded-lg border border-teal-100 bg-teal-50/50 p-3">
                          <p className="text-xs font-medium text-teal-800">
                            Zelle recipient details — shown to customers in the
                            &ldquo;Pay with Zelle&rdquo; email section and secure payment page.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              label="Recipient email"
                              type="email"
                              value={method.recipientEmail}
                              onChange={(e) =>
                                updatePaymentMethod(index, { recipientEmail: e.target.value })
                              }
                              placeholder="payments@mokanco.com"
                            />
                            <Input
                              label="Recipient phone (optional)"
                              value={method.recipientPhone}
                              onChange={(e) =>
                                updatePaymentMethod(index, { recipientPhone: e.target.value })
                              }
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          <Input
                            label="QR code image URL (optional)"
                            value={method.qrCodeUrl}
                            onChange={(e) =>
                              updatePaymentMethod(index, { qrCodeUrl: e.target.value })
                            }
                            placeholder="https://..."
                          />
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={method.enabled}
                            onChange={(e) =>
                              updatePaymentMethod(index, { enabled: e.target.checked })
                            }
                          />
                          Enabled
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePaymentMethod(index)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
