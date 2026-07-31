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
import {
  createArRecurring,
  deleteArRecurring,
  fetchArRecurring,
  runArRecurring,
} from "@/lib/queries/ar";

const FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "custom",
];

export default function ArRecurringPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dueAfterDays, setDueAfterDays] = useState("30");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [autoSend, setAutoSend] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ar", "recurring"],
    queryFn: () => fetchArRecurring({ pageSize: 200 }),
  });

  const locationsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: manage && modalOpen,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createArRecurring({
        name: name.trim(),
        locationId,
        frequency,
        dueAfterDays: Number(dueAfterDays) || 30,
        autoGenerate,
        autoSend,
        items: [
          {
            name: itemName.trim(),
            quantity: Number(itemQty) || 1,
            unitPrice: Number(itemPrice) || 0,
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "recurring"] });
      setModalOpen(false);
      setName("");
      setLocationId("");
      setFrequency("monthly");
      setDueAfterDays("30");
      setAutoGenerate(true);
      setAutoSend(false);
      setItemName("");
      setItemQty("1");
      setItemPrice("0");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const runMutation = useMutation({
    mutationFn: runArRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "recurring"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArRecurring,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ar", "recurring"] }),
  });

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Recurring invoices"
          description="Automated invoice templates on a schedule"
          action={
            manage ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>
                New template
              </Button>
            ) : undefined
          }
        />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No recurring templates yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Frequency</th>
                  <th className="px-6 py-3 font-medium">Next run</th>
                  <th className="px-6 py-3 font-medium">Auto</th>
                  {manage ? <th className="px-6 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {t.locationName ?? t.locationId}
                    </td>
                    <td className="px-6 py-3 capitalize text-slate-600">{t.frequency}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {t.nextRunDate?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {t.autoGenerate ? "Gen " : ""}
                      {t.autoSend ? "Send" : ""}
                      {!t.autoGenerate && !t.autoSend ? "—" : ""}
                    </td>
                    {manage ? (
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={runMutation.isPending}
                            onClick={() => runMutation.mutate(t.id)}
                          >
                            Run now
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm("Delete this recurring template?")) {
                                deleteMutation.mutate(t.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal open={modalOpen} title="New recurring template" onClose={() => setModalOpen(false)} size="lg">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Input
              label="Due after (days)"
              type="number"
              min="0"
              value={dueAfterDays}
              onChange={(e) => setDueAfterDays(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
              />
              Auto-generate
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
              />
              Auto-send
            </label>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Line item</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
              <Input
                label="Qty"
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
              />
              <Input
                label="Unit price"
                type="number"
                min="0"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !name.trim() || !locationId || !itemName.trim() || createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating…" : "Create template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
