"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgePercent,
  CircleDollarSign,
  Layers,
  Wallet,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { Chip, ErrorState, Money } from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { arDatasetQueryKey, filterCredits, useArDataset } from "@/lib/ar/dataset";
import { useArFilters } from "@/lib/ar/filters";
import {
  count,
  humanize,
  money,
  shortDate,
  toDate,
  toNumber,
} from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import {
  applyArCredit,
  createArCredit,
  type ArCredit,
} from "@/lib/queries/ar";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { useSession } from "@/lib/session-context";

const CREDIT_TYPES = ["adjustment", "refund", "promotional", "write_off", "other"];

type CreditRow = ArCredit & { createdAt?: string; issuedAt?: string; creditDate?: string };

function creditDate(c: CreditRow): string | undefined {
  return c.createdAt || c.issuedAt || c.creditDate || undefined;
}

function remainingOf(c: ArCredit): number {
  return toNumber(c.remainingAmount ?? c.amount);
}

function appliedOf(c: ArCredit): number {
  return Math.max(0, toNumber(c.amount) - remainingOf(c));
}

export default function ArCreditsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyCredit, setApplyCredit] = useState<ArCredit | null>(null);
  const [locationId, setLocationId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("adjustment");
  const [reason, setReason] = useState("");
  const [applyInvoiceId, setApplyInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { filters } = useArFilters();
  const { data, isLoading, error, refetch } = useArDataset();

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
      queryClient.invalidateQueries({ queryKey: arDatasetQueryKey });
      toast.success("Credit created");
      setCreateOpen(false);
      setLocationId("");
      setAmount("");
      setType("adjustment");
      setReason("");
      setFormError(null);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      toast.error("Could not create credit", e.message);
    },
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      applyArCredit(applyCredit!.id, {
        invoiceId: applyInvoiceId.trim(),
        amount: applyAmount ? Number(applyAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arDatasetQueryKey });
      toast.success("Credit applied");
      setApplyCredit(null);
      setApplyInvoiceId("");
      setApplyAmount("");
      setFormError(null);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      toast.error("Could not apply credit", e.message);
    },
  });

  const credits = useMemo(
    () => filterCredits(data.credits, filters) as CreditRow[],
    [data.credits, filters],
  );

  const kpis = useMemo(() => {
    const totalIssued = credits.reduce((s, c) => s + toNumber(c.amount), 0);
    const remaining = credits.reduce((s, c) => s + remainingOf(c), 0);
    const applied = credits.reduce((s, c) => s + appliedOf(c), 0);
    return { totalIssued, remaining, applied, count: credits.length };
  }, [credits]);

  const columns = useMemo<Column<CreditRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        accessor: (r) => {
          const d = toDate(creditDate(r));
          return d ? d.getTime() : 0;
        },
        cell: (r) => shortDate(creditDate(r)),
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (r) => r.locationName ?? r.locationId,
        cell: (r) => (
          <span className="font-medium text-slate-900">
            {r.locationName ?? r.locationId}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessor: (r) => r.type ?? "credit",
        cell: (r) => <Chip>{humanize(r.type ?? "credit")}</Chip>,
      },
      {
        id: "reason",
        header: "Reason",
        accessor: (r) => r.reason ?? "",
        cell: (r) => (
          <span className="text-slate-600">{r.reason?.trim() || "—"}</span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        accessor: (r) => toNumber(r.amount),
        align: "right",
        cell: (r) => <Money value={toNumber(r.amount)} />,
      },
      {
        id: "remaining",
        header: "Remaining",
        accessor: (r) => remainingOf(r),
        align: "right",
        cell: (r) => {
          const rem = remainingOf(r);
          return <Money value={rem} tone={rem > 0 ? "pending" : "neutral"} />;
        },
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => r.status ?? "",
        cell: (r) => {
          const status = (r.status ?? "").toLowerCase();
          const tone =
            status === "applied" || status === "exhausted"
              ? "positive"
              : status === "partial" || remPending(r)
                ? "pending"
                : "neutral";
          return <Chip tone={tone}>{humanize(r.status) || "—"}</Chip>;
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
              disabled={remainingOf(r) <= 0}
              onClick={(e) => {
                e.stopPropagation();
                setApplyCredit(r);
                setApplyAmount(String(remainingOf(r)));
                setApplyInvoiceId("");
                setFormError(null);
              }}
            >
              Apply
            </Button>
          ) : null,
      },
    ],
    [manage],
  );

  if (error) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar showStatus={false} showPaymentStatus={false} searchPlaceholder="Search credits, customers, reasons…" />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total issued"
            value={money(kpis.totalIssued)}
            icon={CircleDollarSign}
            accent="purple"
            changePct={null}
          />
          <KpiCard
            label="Remaining balance"
            value={money(kpis.remaining)}
            icon={Wallet}
            accent="teal"
            changePct={null}
            upIsGood={false}
          />
          <KpiCard
            label="Applied"
            value={money(kpis.applied)}
            icon={BadgePercent}
            accent="green"
            changePct={null}
          />
          <KpiCard
            label="Credits count"
            value={count(kpis.count)}
            icon={Layers}
            accent="slate"
            changePct={null}
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Credits"
          description="Account credits and applications to invoices"
          action={
            manage ? (
              <Button
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setCreateOpen(true);
                }}
              >
                Create credit
              </Button>
            ) : undefined
          }
        />
        <PanelBody className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            rows={credits}
            getRowId={(r) => r.id}
            loading={isLoading}
            searchable={false}
            exportFileName="accounts-credits"
            emptyTitle="No credits in this range"
            emptyDescription="Adjust filters, or credits issued to partner accounts will appear here."
            initialSort={{ id: "date", dir: "desc" }}
          />
        </PanelBody>
      </Panel>

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
                {humanize(t)}
              </option>
            ))}
          </Select>
          <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
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
        description={
          applyCredit ? (
            <span>
              Available balance: <Money value={remainingOf(applyCredit)} tone="pending" />
            </span>
          ) : undefined
        }
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
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
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

function remPending(c: ArCredit): boolean {
  return remainingOf(c) > 0 && remainingOf(c) < toNumber(c.amount);
}
