"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  applyArCredit,
  createArCredit,
  fetchArCredits,
  moneyFmt,
  type ArCredit,
} from "@/lib/queries/ar";

const CREDIT_TYPES = ["adjustment", "refund", "promotional", "write_off", "other"];

export default function ArCreditsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyCredit, setApplyCredit] = useState<ArCredit | null>(null);
  const [locationId, setLocationId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("adjustment");
  const [reason, setReason] = useState("");
  const [applyInvoiceId, setApplyInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ar", "credits"],
    queryFn: () => fetchArCredits({ pageSize: 200 }),
  });

  const locationsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: manage && createOpen,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createArCredit({
        locationId,
        amount: Number(amount) || 0,
        type,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "credits"] });
      setCreateOpen(false);
      setLocationId("");
      setAmount("");
      setType("adjustment");
      setReason("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      applyArCredit(applyCredit!.id, {
        invoiceId: applyInvoiceId.trim(),
        amount: applyAmount ? Number(applyAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "credits"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      setApplyCredit(null);
      setApplyInvoiceId("");
      setApplyAmount("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const credits = data?.credits ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Credits"
          description="Account credits and applications to invoices"
          action={
            manage ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create credit
              </Button>
            ) : undefined
          }
        />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading credits…</p>
          ) : credits.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No credits yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Remaining</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Reason</th>
                  {manage ? <th className="px-6 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {credits.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {c.locationName ?? c.locationId}
                    </td>
                    <td className="px-6 py-3 capitalize text-slate-600">
                      {(c.type ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3 text-slate-900">{moneyFmt(c.amount)}</td>
                    <td className="px-6 py-3 text-slate-900">
                      {moneyFmt(c.remainingAmount ?? c.amount)}
                    </td>
                    <td className="px-6 py-3 capitalize text-slate-600">{c.status ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{c.reason || "—"}</td>
                    {manage ? (
                      <td className="px-6 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={(c.remainingAmount ?? c.amount) <= 0}
                          onClick={() => {
                            setApplyCredit(c);
                            setApplyAmount(String(c.remainingAmount ?? c.amount));
                            setError(null);
                          }}
                        >
                          Apply
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal open={createOpen} title="Create credit" onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <Select
            label="Location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="">Select location…</option>
            {(locationsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            {CREDIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!locationId || !amount || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating…" : "Create credit"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(applyCredit)}
        title="Apply credit"
        description={applyCredit ? `Credit: ${moneyFmt(applyCredit.amount)}` : undefined}
        onClose={() => setApplyCredit(null)}
      >
        <div className="space-y-4">
          <Input
            label="Invoice ID"
            value={applyInvoiceId}
            onChange={(e) => setApplyInvoiceId(e.target.value)}
            required
          />
          <Input
            label="Amount to apply"
            type="number"
            min="0"
            step="0.01"
            value={applyAmount}
            onChange={(e) => setApplyAmount(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApplyCredit(null)}>
              Cancel
            </Button>
            <Button
              disabled={!applyInvoiceId.trim() || applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending ? "Applying…" : "Apply credit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
