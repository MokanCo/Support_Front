"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fetchArSettings, updateArSettings } from "@/lib/queries/ar";

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

export default function ArSettingsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
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
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!manage) {
    return <p className="text-sm text-slate-500">Admin access required.</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="AR settings"
          description="Global defaults for invoicing and billing"
        />
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading settings…</p>
          ) : (
            <div className="mx-auto max-w-xl space-y-4">
              <Input
                label="Invoice number prefix"
                value={form.invoiceNumberPrefix}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNumberPrefix: e.target.value }))}
              />
              <Input
                label="Default currency"
                value={form.defaultCurrency}
                onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value }))}
              />
              <Input
                label="Default payment terms (days)"
                type="number"
                min="0"
                value={form.defaultPaymentTermsDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultPaymentTermsDays: e.target.value }))
                }
              />
              <Input
                label="Grace period (days)"
                type="number"
                min="0"
                value={form.gracePeriodDays}
                onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))}
              />
              <Input
                label="Company name"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
              <Input
                label="Billing email"
                type="email"
                value={form.billingEmail}
                onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))}
              />
              <Input
                label="Support email"
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
              />

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {saved ? <p className="text-sm text-green-600">Settings saved.</p> : null}

              <div className="flex justify-end">
                <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
