"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock3,
  CreditCard,
  Landmark,
  Users,
  Wallet,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelHeader } from "@/components/ar/ui/panel";
import { Chip, ErrorState, Money } from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/Textarea";
import { filterInvoices, paymentStateOf, useArDataset } from "@/lib/ar/dataset";
import { useArFilters } from "@/lib/ar/filters";
import { count, money, toNumber } from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import {
  fetchArBillingProfiles,
  sendArAchSetupLink,
  unlinkArAchAccount,
  unlinkArCardAccount,
  upsertArBillingProfile,
  type ArBillingProfile,
} from "@/lib/queries/ar";
import { useSession } from "@/lib/session-context";

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

type CustomerRow = {
  profile: ArBillingProfile;
  invoiced: number;
  outstanding: number;
  overdue: number;
  status: "settled" | "open" | "overdue";
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

export default function ArCustomersPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const dataset = useArDataset();
  const { filters } = useArFilters();
  const [selected, setSelected] = useState<ArBillingProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError, refetch } = useQuery({
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
      toast.success("Billing profile saved");
      closeModal();
    },
    onError: (e: Error) => {
      setError(e.message);
      toast.error("Could not save profile", e.message);
    },
  });

  const sendAchSetupMutation = useMutation({
    mutationFn: sendArAchSetupLink,
    onSuccess: (res) => {
      toast.success("ACH setup link sent", `Emailed to ${res.emailedTo}`);
    },
    onError: (e: Error) => toast.error("Could not send setup link", e.message),
  });

  const unlinkAchMutation = useMutation({
    mutationFn: unlinkArAchAccount,
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ["ar", "billing-profiles"] });
      setSelected(updatedProfile);
      toast.success("Bank account unlinked");
    },
    onError: (e: Error) => toast.error("Could not unlink bank account", e.message),
  });

  const unlinkCardMutation = useMutation({
    mutationFn: unlinkArCardAccount,
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ["ar", "billing-profiles"] });
      setSelected(updatedProfile);
      toast.success("Card unlinked");
    },
    onError: (e: Error) => toast.error("Could not unlink card", e.message),
  });

  function openEdit(profile: ArBillingProfile) {
    if (!manage) return;
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
  const loading = isLoading || dataset.isLoading;

  const { rows, kpis } = useMemo(() => {
    const now = new Date();
    const term = filters.search.trim().toLowerCase();
    const filteredProfiles = profiles.filter((p) => {
      if (filters.locationId && p.locationId !== filters.locationId) return false;
      if (term) {
        const hay = `${p.locationName ?? ""} ${p.billingEmail ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    const invoicesInRange = filterInvoices(dataset.data.invoices, filters, now);
    const byLocation = new Map<
      string,
      { invoiced: number; outstanding: number; overdue: number }
    >();

    for (const inv of invoicesInRange) {
      if (["draft", "cancelled", "void"].includes(inv.status)) continue;
      const agg = byLocation.get(inv.locationId) ?? {
        invoiced: 0,
        outstanding: 0,
        overdue: 0,
      };
      agg.invoiced += toNumber(inv.total);
      const balance = toNumber(inv.balanceDue);
      if (balance > 0) {
        agg.outstanding += balance;
        if (paymentStateOf(inv, now) === "overdue") {
          agg.overdue += balance;
        }
      }
      byLocation.set(inv.locationId, agg);
    }

    const customerRows: CustomerRow[] = filteredProfiles.map((profile) => {
      const agg = byLocation.get(profile.locationId) ?? {
        invoiced: 0,
        outstanding: 0,
        overdue: 0,
      };
      const status: CustomerRow["status"] =
        agg.overdue > 0 ? "overdue" : agg.outstanding > 0 ? "open" : "settled";
      return { profile, ...agg, status };
    });

    const termsValues = filteredProfiles.map((p) => p.paymentTermsDays ?? 30);
    const avgTerms = termsValues.length
      ? termsValues.reduce((s, n) => s + n, 0) / termsValues.length
      : null;

    return {
      rows: customerRows,
      kpis: {
        total: filteredProfiles.length,
        balanceOwed: customerRows.reduce((s, r) => s + r.outstanding, 0),
        overdueCount: customerRows.filter((r) => r.status === "overdue").length,
        avgTerms,
      },
    };
  }, [profiles, dataset.data.invoices, filters]);

  const columns = useMemo<Column<CustomerRow>[]>(
    () => [
      {
        id: "customer",
        header: "Customer",
        accessor: (r) => r.profile.locationName ?? r.profile.locationId,
        cell: (r) => (
          <span className="font-medium text-slate-900">
            {r.profile.locationName ?? r.profile.locationId}
          </span>
        ),
      },
      {
        id: "ach",
        header: "ACH",
        width: "w-28",
        accessor: (r) => r.profile.achPaymentMethod?.status ?? "",
        cell: (r) => {
          const ach = r.profile.achPaymentMethod;
          if (!ach) return <span className="text-slate-300">—</span>;
          if (ach.status === "active") {
            return (
              <Chip tone="positive">
                <Landmark className="h-3 w-3 shrink-0" />
                {ach.last4 ? `••${ach.last4}` : "Linked"}
              </Chip>
            );
          }
          if (ach.status === "pending_verification") {
            return <Chip tone="pending">Verifying</Chip>;
          }
          if (ach.status === "failed") {
            return <Chip tone="negative">Failed</Chip>;
          }
          return <Chip>Revoked</Chip>;
        },
      },
      {
        id: "card",
        header: "Backup card",
        width: "w-32",
        accessor: (r) => r.profile.cardPaymentMethod?.status ?? "",
        cell: (r) => {
          const card = r.profile.cardPaymentMethod;
          if (!card) return <span className="text-slate-300">—</span>;
          if (card.status === "active") {
            return (
              <Chip tone="positive">
                <CreditCard className="h-3 w-3 shrink-0" />
                {card.brand ? `${card.brand} ` : ""}
                {card.last4 ? `••${card.last4}` : "Linked"}
              </Chip>
            );
          }
          return <Chip>Revoked</Chip>;
        },
      },
      {
        id: "email",
        header: "Billing email",
        accessor: (r) => r.profile.billingEmail ?? "",
        cell: (r) => r.profile.billingEmail || "—",
      },
      {
        id: "terms",
        header: "Terms",
        accessor: (r) => r.profile.paymentTermsDays ?? 30,
        cell: (r) => `${r.profile.paymentTermsDays ?? 30} days`,
      },
      {
        id: "auto",
        header: "Auto-invoice",
        accessor: (r) => (r.profile.autoGenerateInvoice ? "Yes" : "No"),
        cell: (r) => (
          <Chip tone={r.profile.autoGenerateInvoice ? "positive" : "neutral"}>
            {r.profile.autoGenerateInvoice ? "Yes" : "No"}
          </Chip>
        ),
      },
      {
        id: "invoiced",
        header: "Invoiced",
        accessor: (r) => r.invoiced,
        align: "right",
        cell: (r) => <Money value={r.invoiced} />,
      },
      {
        id: "outstanding",
        header: "Outstanding",
        accessor: (r) => r.outstanding,
        align: "right",
        cell: (r) => <Money value={r.outstanding} />,
      },
      {
        id: "overdue",
        header: "Overdue",
        accessor: (r) => r.overdue,
        align: "right",
        cell: (r) => (
          <Money
            value={r.overdue}
            tone={r.overdue > 0 ? "negative" : "neutral"}
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => r.status,
        cell: (r) => {
          if (r.status === "overdue") {
            return <Chip tone="negative">Overdue</Chip>;
          }
          if (r.status === "open") {
            return <Chip tone="pending">Open</Chip>;
          }
          return <Chip tone="positive">Settled</Chip>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        accessor: () => "",
        sortable: false,
        locked: true,
        cell: (r) =>
          manage ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(r.profile);
              }}
            >
              Edit
            </Button>
          ) : null,
      },
    ],
    [manage],
  );

  if (listError) {
    return (
      <ErrorState
        message={(listError as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  if (dataset.error) {
    return (
      <ErrorState
        message={(dataset.error as Error).message}
        onRetry={() => dataset.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar showStatus={false} showPaymentStatus={false} searchPlaceholder="Search customers…" />
        </div>
      </Panel>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total customers"
            value={count(kpis.total)}
            icon={Users}
            accent="blue"
            changePct={null}
          />
          <KpiCard
            label="Active balance owed"
            value={money(kpis.balanceOwed)}
            icon={Wallet}
            accent="purple"
            changePct={null}
            upIsGood={false}
          />
          <KpiCard
            label="Customers overdue"
            value={count(kpis.overdueCount)}
            icon={AlertTriangle}
            accent="red"
            changePct={null}
            upIsGood={false}
          />
          <KpiCard
            label="Average payment terms"
            value={
              kpis.avgTerms == null
                ? "—"
                : `${Math.round(kpis.avgTerms)} days`
            }
            icon={Clock3}
            accent="slate"
            changePct={null}
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Customers"
          description="Billing profiles and open balances per partner location"
        />
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.profile.locationId}
          loading={loading}
          searchable={false}
          exportFileName="accounts-customers"
          emptyTitle="No customers match your filters"
          emptyDescription="Billing profiles appear here once partner locations are configured for invoicing."
          onRowClick={manage ? (r) => openEdit(r.profile) : undefined}
          initialSort={{ id: "customer", dir: "asc" }}
        />
      </Panel>

      <Modal
        open={Boolean(selected && form && manage)}
        title={selected?.locationName ?? "Billing profile"}
        description={`Location ID: ${selected?.locationId ?? ""}`}
        onClose={closeModal}
        size="lg"
      >
        {form ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">Automatic ACH billing</p>
                {selected?.achPaymentMethod?.status === "active" ? (
                  <p className="mt-0.5 text-slate-600">
                    Bank on file
                    {selected.achPaymentMethod.bankName
                      ? ` · ${selected.achPaymentMethod.bankName}`
                      : ""}
                    {selected.achPaymentMethod.last4
                      ? ` · ****${selected.achPaymentMethod.last4}`
                      : ""}
                  </p>
                ) : selected?.achPaymentMethod?.status === "pending_verification" ? (
                  <p className="mt-0.5 text-slate-600">Bank linked, awaiting verification</p>
                ) : selected?.achPaymentMethod?.status === "revoked" ? (
                  <p className="mt-0.5 text-slate-600">
                    Bank account unlinked — send a new setup link to link one again.
                  </p>
                ) : selected?.achPaymentMethod?.status === "failed" ? (
                  <p className="mt-0.5 text-slate-600">
                    Bank linking failed — send a new setup link to try again.
                  </p>
                ) : (
                  <p className="mt-0.5 text-slate-600">
                    No bank account linked yet — send a one-time setup link so future
                    invoices can be charged directly.
                  </p>
                )}
              </div>
              {selected?.achPaymentMethod?.status === "active" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={unlinkAchMutation.isPending}
                  onClick={() => {
                    if (
                      selected &&
                      confirm(
                        "Unlink this bank account? Future invoices will no longer be chargeable automatically until a new bank account is linked.",
                      )
                    ) {
                      unlinkAchMutation.mutate(selected.locationId);
                    }
                  }}
                >
                  {unlinkAchMutation.isPending ? "Unlinking…" : "Unlink"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sendAchSetupMutation.isPending}
                  onClick={() => selected && sendAchSetupMutation.mutate(selected.locationId)}
                >
                  {sendAchSetupMutation.isPending ? "Sending…" : "Email ACH setup link"}
                </Button>
              )}
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">Backup credit card</p>
                {selected?.cardPaymentMethod?.status === "active" ? (
                  <p className="mt-0.5 text-slate-600">
                    {selected.cardPaymentMethod.brand || "Card"} on file
                    {selected.cardPaymentMethod.last4
                      ? ` · ····${selected.cardPaymentMethod.last4}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-0.5 text-slate-600">
                    No backup card yet — the customer can add one as an optional
                    step on the same ACH setup link. Only ever charged manually,
                    never automatically.
                  </p>
                )}
              </div>
              {selected?.cardPaymentMethod?.status === "active" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={unlinkCardMutation.isPending}
                  onClick={() => {
                    if (selected && confirm("Unlink this backup card?")) {
                      unlinkCardMutation.mutate(selected.locationId);
                    }
                  }}
                >
                  {unlinkCardMutation.isPending ? "Unlinking…" : "Unlink"}
                </Button>
              ) : null}
            </div>
            <Input
              label="Billing email"
              type="email"
              value={form.billingEmail}
              onChange={(e) =>
                setForm((f) => f && { ...f, billingEmail: e.target.value })
              }
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => f && { ...f, phone: e.target.value })
              }
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
                onChange={(e) =>
                  setForm((f) => f && { ...f, currency: e.target.value })
                }
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
                    setForm(
                      (f) => f && { ...f, autoGenerateInvoice: e.target.checked },
                    )
                  }
                />
                Auto-generate invoice
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoSendInvoice}
                  onChange={(e) =>
                    setForm(
                      (f) => f && { ...f, autoSendInvoice: e.target.checked },
                    )
                  }
                />
                Auto-send invoice
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lateFeeEnabled}
                  onChange={(e) =>
                    setForm(
                      (f) => f && { ...f, lateFeeEnabled: e.target.checked },
                    )
                  }
                />
                Late fee enabled
              </label>
            </div>
            <Textarea
              label="Internal notes"
              value={form.internalNotes}
              onChange={(e) =>
                setForm((f) => f && { ...f, internalNotes: e.target.value })
              }
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
