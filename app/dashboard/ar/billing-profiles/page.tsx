"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  fetchArBillingProfiles,
  upsertArBillingProfile,
  type ArBillingProfile,
} from "@/lib/queries/ar";

type ProfileForm = {
  billingEmail: string;
  phone: string;
  paymentTermsDays: string;
  currency: string;
  autoGenerateInvoice: boolean;
  autoSendInvoice: boolean;
  lateFeeEnabled: boolean;
  lateFeeAmount: string;
  gracePeriodDays: string;
  internalNotes: string;
};

function toForm(p: ArBillingProfile): ProfileForm {
  return {
    billingEmail: p.billingEmail ?? "",
    phone: p.phone ?? "",
    paymentTermsDays: String(p.paymentTermsDays ?? 30),
    currency: p.currency ?? "USD",
    autoGenerateInvoice: p.autoGenerateInvoice ?? false,
    autoSendInvoice: p.autoSendInvoice ?? false,
    lateFeeEnabled: p.lateFeeEnabled ?? false,
    lateFeeAmount: String(p.lateFeeAmount ?? 0),
    gracePeriodDays: String(p.gracePeriodDays ?? 0),
    internalNotes: p.internalNotes ?? "",
  };
}

export default function ArBillingProfilesPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ArBillingProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ar", "billing-profiles"],
    queryFn: () => fetchArBillingProfiles({ pageSize: 200 }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !form) throw new Error("No profile selected");
      return upsertArBillingProfile(selected.locationId, {
        billingEmail: form.billingEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        paymentTermsDays: Number(form.paymentTermsDays) || 30,
        currency: form.currency.trim() || "USD",
        autoGenerateInvoice: form.autoGenerateInvoice,
        autoSendInvoice: form.autoSendInvoice,
        lateFeeEnabled: form.lateFeeEnabled,
        lateFeeAmount: Number(form.lateFeeAmount) || 0,
        gracePeriodDays: Number(form.gracePeriodDays) || 0,
        internalNotes: form.internalNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "billing-profiles"] });
      closeModal();
    },
    onError: (e: Error) => setError(e.message),
  });

  function openEdit(profile: ArBillingProfile) {
    setSelected(profile);
    setForm(toForm(profile));
    setError(null);
  }

  function closeModal() {
    setSelected(null);
    setForm(null);
    setError(null);
  }

  const profiles = data?.profiles ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Billing Profiles"
          description="Per-location billing settings and payment terms"
        />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading billing profiles…</p>
          ) : profiles.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No billing profiles yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Billing email</th>
                  <th className="px-6 py-3 font-medium">Terms</th>
                  <th className="px-6 py-3 font-medium">Currency</th>
                  <th className="px-6 py-3 font-medium">Auto</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr
                    key={p.locationId}
                    className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/50"
                    onClick={() => openEdit(p)}
                  >
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {p.locationName ?? p.locationId}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{p.billingEmail || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {p.paymentTermsDays ?? 30} days
                    </td>
                    <td className="px-6 py-3 text-slate-600">{p.currency ?? "USD"}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {p.autoGenerateInvoice ? "Gen " : ""}
                      {p.autoSendInvoice ? "Send" : ""}
                      {!p.autoGenerateInvoice && !p.autoSendInvoice ? "—" : ""}
                    </td>
                    <td className="px-6 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected && form)}
        title={selected?.locationName ?? "Billing profile"}
        description={`Location ID: ${selected?.locationId ?? ""}`}
        onClose={closeModal}
        size="lg"
      >
        {form ? (
          <div className="space-y-4">
            <Input
              label="Billing email"
              type="email"
              value={form.billingEmail}
              onChange={(e) => setForm((f) => f && { ...f, billingEmail: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => f && { ...f, phone: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Payment terms (days)"
                type="number"
                min="0"
                value={form.paymentTermsDays}
                onChange={(e) =>
                  setForm((f) => f && { ...f, paymentTermsDays: e.target.value })
                }
              />
              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm((f) => f && { ...f, currency: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Grace period (days)"
                type="number"
                min="0"
                value={form.gracePeriodDays}
                onChange={(e) =>
                  setForm((f) => f && { ...f, gracePeriodDays: e.target.value })
                }
              />
              <Input
                label="Late fee amount"
                type="number"
                min="0"
                step="0.01"
                value={form.lateFeeAmount}
                onChange={(e) =>
                  setForm((f) => f && { ...f, lateFeeAmount: e.target.value })
                }
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoGenerateInvoice}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, autoGenerateInvoice: e.target.checked })
                  }
                />
                Auto-generate invoice
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoSendInvoice}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, autoSendInvoice: e.target.checked })
                  }
                />
                Auto-send invoice
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lateFeeEnabled}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, lateFeeEnabled: e.target.checked })
                  }
                />
                Late fee enabled
              </label>
            </div>
            <Textarea
              label="Internal notes"
              value={form.internalNotes}
              onChange={(e) => setForm((f) => f && { ...f, internalNotes: e.target.value })}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
