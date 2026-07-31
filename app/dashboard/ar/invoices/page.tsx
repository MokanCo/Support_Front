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
  createArInvoice,
  downloadArInvoicePdf,
  fetchArInvoice,
  fetchArInvoices,
  invoiceAction,
  moneyFmt,
  type ArInvoice,
} from "@/lib/queries/ar";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type LineItem = { name: string; quantity: string; unitPrice: string };

export default function ArInvoicesPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { name: "", quantity: "1", unitPrice: "0" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["ar", "invoices", search, status],
    queryFn: () =>
      fetchArInvoices({
        pageSize: 100,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const locationsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: manage && createOpen,
  });

  const detailQuery = useQuery({
    queryKey: ["ar", "invoice", detailId],
    queryFn: () => fetchArInvoice(detailId!),
    enabled: Boolean(detailId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createArInvoice({
        locationId,
        items: items.map((i) => ({
          name: i.name.trim(),
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      setCreateOpen(false);
      setLocationId("");
      setItems([{ name: "", quantity: "1", unitPrice: "0" }]);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => invoiceAction(id, action),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoice", id] });
      setActionError(null);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  async function handleDownload(invoice: ArInvoice) {
    try {
      const blob = await downloadArInvoicePdf(invoice.id);
      downloadBlob(blob, `${invoice.invoiceNumber || invoice.id}.pdf`);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const invoices = listQuery.data?.invoices ?? [];
  const detail = detailQuery.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Invoices"
          description="Create, send, and manage partner invoices"
          action={
            manage ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New invoice
              </Button>
            ) : undefined
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="max-w-xs"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {listQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Invoice #</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {inv.locationName ?? inv.locationId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
                          {inv.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{moneyFmt(inv.total)}</td>
                      <td className="px-4 py-3 text-slate-900">{moneyFmt(inv.balanceDue)}</td>
                      <td className="px-4 py-3 text-slate-600">{inv.dueDate?.slice(0, 10) ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetailId(inv.id)}>
                            View
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(inv)}>
                            PDF
                          </Button>
                          {manage ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({ id: inv.id, action: "approve" })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({ id: inv.id, action: "send" })}
                              >
                                Send
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({ id: inv.id, action: "duplicate" })}
                              >
                                Duplicate
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={actionMutation.isPending}
                                onClick={() => {
                                  if (confirm("Cancel this invoice?")) {
                                    actionMutation.mutate({ id: inv.id, action: "cancel" });
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
        </CardBody>
      </Card>

      <Modal open={createOpen} title="New invoice" onClose={() => setCreateOpen(false)} size="lg">
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Line items</p>
            {items.map((item, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-3">
                <Input
                  label="Item name"
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)),
                    )
                  }
                />
                <Input
                  label="Qty"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, quantity: e.target.value } : it)),
                    )
                  }
                />
                <Input
                  label="Unit price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, unitPrice: e.target.value } : it,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setItems((prev) => [...prev, { name: "", quantity: "1", unitPrice: "0" }])
              }
            >
              Add line
            </Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !locationId || !items.some((i) => i.name.trim()) || createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating…" : "Create invoice"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detailId)}
        title={detail?.invoiceNumber ?? "Invoice detail"}
        onClose={() => setDetailId(null)}
        size="xl"
      >
        {detailQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="font-medium capitalize text-slate-900">
                  {detail.status.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="font-medium text-slate-900">{moneyFmt(detail.total)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Paid</div>
                <div className="font-medium text-slate-900">{moneyFmt(detail.amountPaid)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Balance due</div>
                <div className="font-medium text-slate-900">{moneyFmt(detail.balanceDue)}</div>
              </div>
            </div>

            {detail.items?.length ? (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">Items</h3>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-slate-500">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Qty</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2 pr-4">{item.name}</td>
                        <td className="py-2 pr-4">{item.quantity}</td>
                        <td className="py-2 pr-4">{moneyFmt(item.unitPrice)}</td>
                        <td className="py-2">
                          {moneyFmt(item.lineTotal ?? item.quantity * item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Timeline</h3>
              {detail.timeline?.length ? (
                <ul className="space-y-2">
                  {detail.timeline.map((ev, i) => (
                    <li key={i} className="rounded-lg border border-slate-100 p-3 text-sm">
                      <div className="font-medium text-slate-900">{ev.title}</div>
                      {ev.description ? (
                        <div className="text-slate-600">{ev.description}</div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-400">
                        {[ev.userName, ev.createdAt?.slice(0, 16).replace("T", " ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No timeline events.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => handleDownload(detail)}>
                Download PDF
              </Button>
              {manage ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => actionMutation.mutate({ id: detail.id, action: "approve" })}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => actionMutation.mutate({ id: detail.id, action: "send" })}
                  >
                    Send
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => actionMutation.mutate({ id: detail.id, action: "duplicate" })}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm("Cancel this invoice?")) {
                        actionMutation.mutate({ id: detail.id, action: "cancel" });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-600">Failed to load invoice.</p>
        )}
      </Modal>
    </div>
  );
}
