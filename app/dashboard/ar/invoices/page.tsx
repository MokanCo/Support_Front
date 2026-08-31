"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CircleDollarSign,
  FileText,
  Wallet,
} from "lucide-react";
import { ChargeAchModal } from "@/components/ar/invoices/charge-ach-modal";
import { InvoiceDetail } from "@/components/ar/invoices/invoice-detail";
import { InvoiceRowActions } from "@/components/ar/invoices/row-actions";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelHeader } from "@/components/ar/ui/panel";
import {
  Amount,
  Chip,
  ErrorState,
  InlineSpinner,
  Money,
  StatusBadge,
} from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import {
  arDatasetQueryKey,
  filterInvoices,
  paymentStateOf,
  useArDataset,
} from "@/lib/ar/dataset";
import { useArFilters } from "@/lib/ar/filters";
import {
  count,
  daysPastDue,
  money,
  shortDate,
  toNumber,
} from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import {
  chargeArInvoiceAch,
  createArInvoice,
  downloadArInvoicePdf,
  fetchArBillingProfiles,
  fetchArInvoice,
  fetchArInvoiceTemplates,
  fetchArProducts,
  invoiceAction,
  type ArAchPaymentMethod,
  type ArInvoice,
  type ArProduct,
} from "@/lib/queries/ar";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { useSession } from "@/lib/session-context";
import { payableBreakdown } from "@/lib/stripe/payable";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type LineItem = {
  productId?: string;
  name: string;
  description?: string;
  quantity: string;
  unitPrice: string;
  taxable?: boolean;
  taxPercentage?: number;
  /** Seeded from a required product — cannot be removed. */
  locked?: boolean;
};

function emptyLine(): LineItem {
  return { name: "", quantity: "1", unitPrice: "0" };
}

function lineFromProduct(product: ArProduct, locked = false): LineItem {
  return {
    productId: product.id,
    name: product.name,
    description: product.description || "",
    quantity: "1",
    unitPrice: String(product.price ?? 0),
    taxable: Boolean(product.taxable),
    taxPercentage: Number(product.taxPercentage) || 0,
    locked,
  };
}

function invoiceKpis(invoices: ArInvoice[]) {
  const billable = invoices.filter(
    (i) => !["draft", "cancelled", "void"].includes(i.status),
  );
  const now = new Date();
  return {
    totalInvoiced: billable.reduce((s, i) => s + toNumber(i.total), 0),
    outstanding: billable.reduce((s, i) => s + toNumber(i.balanceDue), 0),
    overdue: billable
      .filter((i) => paymentStateOf(i, now) === "overdue")
      .reduce((s, i) => s + toNumber(i.balanceDue), 0),
    paid: billable.reduce((s, i) => s + toNumber(i.amountPaid), 0),
  };
}

export default function ArInvoicesPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const { filters } = useArFilters();
  const { data, isLoading, error, refetch } = useArDataset();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [achTarget, setAchTarget] = useState<ArInvoice | null>(null);
  const [locationId, setLocationId] = useState("");
  const [invoiceTemplateId, setInvoiceTemplateId] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [addProductId, setAddProductId] = useState("");
  const [chargeAchOnCreate, setChargeAchOnCreate] = useState(false);
  const linesSeededRef = useRef(false);

  const invoices = useMemo(
    () => filterInvoices(data.invoices, filters),
    [data.invoices, filters],
  );
  const kpis = useMemo(() => invoiceKpis(invoices), [invoices]);

  const billingProfilesQuery = useQuery({
    queryKey: ["ar", "billing-profiles"],
    queryFn: () => fetchArBillingProfiles({ pageSize: 200 }),
  });
  const achByLocation = useMemo(() => {
    const map = new Map<string, ArAchPaymentMethod>();
    for (const profile of billingProfilesQuery.data?.profiles ?? []) {
      if (profile.achPaymentMethod) map.set(profile.locationId, profile.achPaymentMethod);
    }
    return map;
  }, [billingProfilesQuery.data]);

  const locationsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: manage && createOpen,
  });

  const templatesQuery = useQuery({
    queryKey: ["ar", "invoice-templates"],
    queryFn: fetchArInvoiceTemplates,
    enabled: manage && createOpen,
  });

  const productsQuery = useQuery({
    queryKey: ["ar", "products", "invoice-create"],
    queryFn: () => fetchArProducts({ pageSize: 200, active: "true" }),
    enabled: manage && createOpen,
  });

  const activeProducts = useMemo(
    () => (productsQuery.data?.products ?? []).filter((p) => p.isActive !== false),
    [productsQuery.data],
  );

  const selectableProducts = useMemo(() => {
    const used = new Set(items.map((i) => i.productId).filter(Boolean));
    return activeProducts.filter((p) => !p.isRequired && !used.has(p.id));
  }, [activeProducts, items]);

  /** Rough pre-tax estimate from the line items being drafted — the actual
   *  ACH fee is computed server-side against the final invoice total once
   *  tax/discounts are applied. */
  const estimatedInvoiceTotal = useMemo(
    () =>
      items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0),
    [items],
  );
  const achFeeEstimate = useMemo(
    () => payableBreakdown("ach", estimatedInvoiceTotal),
    [estimatedInvoiceTotal],
  );

  useEffect(() => {
    if (!createOpen) {
      linesSeededRef.current = false;
      return;
    }
    if (linesSeededRef.current || !productsQuery.isSuccess) return;
    linesSeededRef.current = true;
    const required = activeProducts.filter((p) => p.isRequired);
    setItems(
      required.length > 0
        ? required.map((p) => lineFromProduct(p, true))
        : [emptyLine()],
    );
  }, [createOpen, productsQuery.isSuccess, activeProducts]);

  const detailQuery = useQuery({
    queryKey: ["ar", "invoice", detailId],
    queryFn: () => fetchArInvoice(detailId!),
    enabled: Boolean(detailId),
  });

  function invalidateAr() {
    queryClient.invalidateQueries({ queryKey: arDatasetQueryKey });
    queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
  }

  function resetCreateForm() {
    setLocationId("");
    setInvoiceTemplateId("");
    setItems([emptyLine()]);
    setAddProductId("");
    setChargeAchOnCreate(false);
    linesSeededRef.current = false;
  }

  function addProductLine(productId: string) {
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => {
      const blankOnly =
        prev.length === 1 && !prev[0].name.trim() && !prev[0].productId;
      const next = blankOnly ? [] : [...prev];
      if (next.some((i) => i.productId === product.id)) return prev;
      return [...next, lineFromProduct(product, false)];
    });
    setAddProductId("");
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createArInvoice({
        locationId,
        invoiceTemplateId: invoiceTemplateId || undefined,
        items: items
          .filter((i) => i.name.trim())
          .map((i) => ({
            productId: i.productId || undefined,
            name: i.name.trim(),
            description: i.description?.trim() || undefined,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxable: Boolean(i.taxable),
            taxPercentage: Number(i.taxPercentage) || 0,
          })),
      }),
    onSuccess: (invoice) => {
      invalidateAr();
      setCreateOpen(false);
      const shouldChargeAch = chargeAchOnCreate;
      resetCreateForm();
      if (shouldChargeAch) {
        toast.success("Invoice created", "Charging the saved ACH bank account now…");
        chargeAchMutation.mutate(invoice.id);
      } else {
        toast.success("Invoice created");
      }
    },
    onError: (e: Error) => toast.error("Could not create invoice", e.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      invoiceAction(id, action),
    onSuccess: (_, { id, action }) => {
      invalidateAr();
      queryClient.invalidateQueries({ queryKey: ["ar", "invoice", id] });
      const labels: Record<string, string> = {
        approve: "Invoice approved",
        send: "Invoice sent",
        duplicate: "Invoice duplicated",
        cancel: "Invoice cancelled",
      };
      toast.success(labels[action] ?? "Action completed");
    },
    onError: (e: Error) => toast.error("Action failed", e.message),
  });

  const chargeAchMutation = useMutation({
    mutationFn: chargeArInvoiceAch,
    onSuccess: () => {
      invalidateAr();
      toast.success("ACH charge initiated", "The invoice will update once Stripe confirms the debit.");
      setAchTarget(null);
    },
    onError: (e: Error) => toast.error("Could not charge ACH", e.message),
  });

  async function handleDownload(invoice: ArInvoice) {
    setDownloadingId(invoice.id);
    try {
      const blob = await downloadArInvoicePdf(invoice.id);
      downloadBlob(blob, `${invoice.invoiceNumber || invoice.id}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error("Download failed", (e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  }

  function runCancel(id: string) {
    if (confirm("Cancel this invoice?")) {
      actionMutation.mutate({ id, action: "cancel" });
    }
  }

  const columns = useMemo<Column<ArInvoice>[]>(
    () => [
      {
        id: "number",
        header: "Invoice #",
        accessor: (row) => row.invoiceNumber,
        cell: (row) => (
          <span className="font-medium font-mono text-slate-900">
            {row.invoiceNumber}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (row) => row.locationName ?? row.locationId,
      },
      {
        id: "description",
        header: "Description",
        width: "w-64",
        accessor: (row) => row.notes ?? "",
        cell: (row) =>
          row.notes ? (
            <span className="line-clamp-2 text-slate-600" title={row.notes}>
              {row.notes}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "issued",
        header: "Issued",
        accessor: (row) => row.invoiceDate ?? "",
        cell: (row) => shortDate(row.invoiceDate),
      },
      {
        id: "due",
        header: "Due",
        accessor: (row) => row.dueDate ?? "",
        cell: (row) => {
          const balance = toNumber(row.balanceDue);
          const days = daysPastDue(row.dueDate);
          const showOverdue =
            balance > 0 &&
            days > 0 &&
            !["draft", "cancelled", "void", "paid"].includes(row.status);
          return (
            <div>
              <div>{shortDate(row.dueDate)}</div>
              {showOverdue ? (
                <div className="mt-0.5 text-[11px] font-medium text-rose-600">
                  {days} day{days === 1 ? "" : "s"} overdue
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessor: (row) => row.status,
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={row.status} />
            {row.achCharge?.status === "processing" ? (
              <Chip tone="pending">ACH processing</Chip>
            ) : row.achCharge?.status === "failed" ? (
              <Chip tone="negative">
                {row.achCharge.failureReason ? `ACH failed · ${row.achCharge.failureReason}` : "ACH failed"}
              </Chip>
            ) : null}
          </div>
        ),
      },
      {
        id: "total",
        header: "Total",
        accessor: (row) => toNumber(row.total),
        align: "right",
        cell: (row) => <Amount value={row.total} />,
      },
      {
        id: "paid",
        header: "Paid",
        accessor: (row) => toNumber(row.amountPaid),
        align: "right",
        cell: (row) => <Money value={row.amountPaid} />,
      },
      {
        id: "balance",
        header: "Balance",
        accessor: (row) => toNumber(row.balanceDue),
        align: "right",
        cell: (row) => (
          <Money
            value={row.balanceDue}
            tone={toNumber(row.balanceDue) > 0 ? "pending" : "neutral"}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        accessor: () => "",
        sortable: false,
        locked: true,
        align: "right",
        cell: (row) => {
          const achMethod = achByLocation.get(row.locationId);
          const achAvailable =
            achMethod?.status === "active" &&
            toNumber(row.balanceDue) > 0 &&
            row.achCharge?.status !== "processing" &&
            !["draft", "cancelled", "void", "paid"].includes(row.status);
          return (
            <InvoiceRowActions
              canManage={manage}
              busy={
                (actionMutation.isPending && actionMutation.variables?.id === row.id) ||
                (chargeAchMutation.isPending && chargeAchMutation.variables === row.id) ||
                downloadingId === row.id
              }
              achAvailable={achAvailable}
              onView={() => setDetailId(row.id)}
              onSend={() => actionMutation.mutate({ id: row.id, action: "send" })}
              onApprove={() =>
                actionMutation.mutate({ id: row.id, action: "approve" })
              }
              onDuplicate={() =>
                actionMutation.mutate({ id: row.id, action: "duplicate" })
              }
              onDownload={() => handleDownload(row)}
              onCancel={() => runCancel(row.id)}
              onChargeAch={() => setAchTarget(row)}
            />
          );
        },
      },
    ],
    [
      manage,
      actionMutation.isPending,
      actionMutation.variables,
      chargeAchMutation.isPending,
      chargeAchMutation.variables,
      downloadingId,
      achByLocation,
    ],
  );

  if (error) {
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  const detail = detailQuery.data;

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total invoiced"
            value={money(kpis.totalInvoiced)}
            icon={FileText}
            accent="blue"
            hint={`${count(invoices.length)} in view`}
          />
          <KpiCard
            label="Outstanding"
            value={money(kpis.outstanding)}
            icon={Wallet}
            accent="purple"
          />
          <KpiCard
            label="Overdue"
            value={money(kpis.overdue)}
            icon={AlertTriangle}
            accent="red"
          />
          <KpiCard
            label="Paid"
            value={money(kpis.paid)}
            icon={CircleDollarSign}
            accent="green"
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
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
        <DataTable
          columns={columns}
          rows={invoices}
          getRowId={(row) => row.id}
          loading={isLoading}
          searchable={false}
          initialSort={{ id: "issued", dir: "desc" }}
          exportFileName="accounts-invoices"
          emptyTitle="No invoices in this range"
          emptyDescription="Adjust filters or create a new invoice to get started."
          emptyAction={
            manage ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New invoice
              </Button>
            ) : undefined
          }
        />
      </Panel>

      <Modal
        open={createOpen}
        title="New invoice"
        onClose={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        size="lg"
      >
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
          {locationId && achByLocation.get(locationId)?.status === "active" ? (
            <label className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={chargeAchOnCreate}
                onChange={(e) => {
                  setChargeAchOnCreate(e.target.checked);
                  if (e.target.checked) setInvoiceTemplateId("");
                }}
              />
              <span>
                <span className="font-medium text-slate-900">
                  Charge saved ACH bank account immediately
                </span>
                {achByLocation.get(locationId)?.last4 ? (
                  <>
                    {" "}
                    (account ending in {achByLocation.get(locationId)?.last4})
                  </>
                ) : null}
                <br />
                No invoice email is sent — the customer&apos;s bank account is
                debited directly as soon as this invoice is created, and the
                payment is recorded against it once Stripe confirms the debit
                (3–5 business days).
                {achFeeEstimate.showFee ? (
                  <>
                    {" "}
                    A processing fee ({achFeeEstimate.percentLabel}, ~
                    {money(achFeeEstimate.processingFee)} on the current line
                    items) is added on top so the business receives the full
                    invoice amount.
                  </>
                ) : null}
              </span>
            </label>
          ) : null}
          {!chargeAchOnCreate ? (
            <Select
              label="Invoice PDF template"
              value={invoiceTemplateId}
              onChange={(e) => setInvoiceTemplateId(e.target.value)}
            >
              <option value="">Default template</option>
              {(templatesQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault ? " (default)" : ""}
                </option>
              ))}
            </Select>
          ) : null}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Line items</p>
              {productsQuery.isLoading ? (
                <span className="text-xs text-slate-400">Loading products…</span>
              ) : null}
            </div>
            {items.some((i) => i.locked) ? (
              <p className="text-xs text-slate-500">
                Required products are pre-filled. Add optional products from the
                dropdown below, or type a custom line.
              </p>
            ) : null}
            {items.map((item, idx) => (
              <div
                key={`${item.productId || "line"}-${idx}`}
                className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  {item.locked ? (
                    <Chip tone="positive">Required</Chip>
                  ) : item.productId ? (
                    <Chip>Product</Chip>
                  ) : (
                    <Chip>Custom</Chip>
                  )}
                  {!item.locked ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setItems((prev) =>
                          prev.length <= 1
                            ? [emptyLine()]
                            : prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    label="Item name"
                    value={item.name}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, name: e.target.value } : it,
                        ),
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
                        prev.map((it, i) =>
                          i === idx ? { ...it, quantity: e.target.value } : it,
                        ),
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
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Select
                  label="Add product"
                  value={addProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAddProductId(id);
                    if (id) addProductLine(id);
                  }}
                  disabled={!selectableProducts.length}
                >
                  <option value="">
                    {selectableProducts.length
                      ? "Select an optional product…"
                      : "No optional products available"}
                  </option>
                  {selectableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.price)}
                      {p.category ? ` · ${p.category}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setItems((prev) => [...prev, emptyLine()])}
              >
                Add custom line
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !locationId ||
                !items.some((i) => i.name.trim()) ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending
                ? "Creating…"
                : chargeAchOnCreate
                  ? "Create & charge ACH"
                  : "Create invoice"}
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
          <InlineSpinner label="Loading invoice…" />
        ) : detail ? (
          <InvoiceDetail
            invoice={detail}
            canManage={manage}
            pendingAction={
              actionMutation.isPending && actionMutation.variables?.id === detail.id
                ? (actionMutation.variables.action as
                    | "approve"
                    | "send"
                    | "duplicate"
                    | "cancel")
                : null
            }
            downloading={downloadingId === detail.id}
            achMethod={achByLocation.get(detail.locationId) ?? null}
            chargingAch={
              chargeAchMutation.isPending && chargeAchMutation.variables === detail.id
            }
            onDownload={() => handleDownload(detail)}
            onApprove={() =>
              actionMutation.mutate({ id: detail.id, action: "approve" })
            }
            onSend={() =>
              actionMutation.mutate({ id: detail.id, action: "send" })
            }
            onDuplicate={() =>
              actionMutation.mutate({ id: detail.id, action: "duplicate" })
            }
            onCancel={() => runCancel(detail.id)}
            onChargeAch={() => setAchTarget(detail)}
          />
        ) : (
          <ErrorState message="Failed to load invoice." />
        )}
      </Modal>

      <ChargeAchModal
        invoice={achTarget}
        achMethod={achTarget ? achByLocation.get(achTarget.locationId) : null}
        pending={chargeAchMutation.isPending}
        onConfirm={() => achTarget && chargeAchMutation.mutate(achTarget.id)}
        onClose={() => setAchTarget(null)}
      />
    </div>
  );
}
