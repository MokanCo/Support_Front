"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { Chip, ErrorState } from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { useArFilters } from "@/lib/ar/filters";
import {
  count,
  daysBetween,
  humanize,
  money,
  shortDate,
  toDate,
  toNumber,
} from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import {
  createArRecurring,
  deleteArRecurring,
  fetchArRecurring,
  runArRecurring,
  type ArRecurring,
} from "@/lib/queries/ar";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { useSession } from "@/lib/session-context";

const FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "custom",
];

type RecurringRow = ArRecurring & {
  amount?: number;
  estimatedAmount?: number;
  monthlyAmount?: number;
  totalAmount?: number;
  items?: { quantity?: number; unitPrice?: number }[];
};

function templateAmount(t: RecurringRow): number | null {
  for (const key of ["monthlyAmount", "estimatedAmount", "amount", "totalAmount"] as const) {
    if (t[key] != null && Number.isFinite(Number(t[key]))) {
      return toNumber(t[key]);
    }
  }
  if (Array.isArray(t.items) && t.items.length > 0) {
    return t.items.reduce(
      (s, item) => s + toNumber(item.quantity ?? 1) * toNumber(item.unitPrice),
      0,
    );
  }
  return null;
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return amount * (52 / 12);
    case "biweekly":
      return amount * (26 / 12);
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "semi_annual":
      return amount / 6;
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}

function daysUntil(nextRun: unknown, now = new Date()): number | null {
  return daysBetween(now, nextRun);
}

export default function ArRecurringPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const { filters } = useArFilters();
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
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
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
      toast.success("Template created");
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
      setFormError(null);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      toast.error("Could not create template", e.message);
    },
  });

  const runMutation = useMutation({
    mutationFn: runArRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "recurring"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      toast.success("Template run started");
    },
    onError: (e: Error) => toast.error("Could not run template", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "recurring"] });
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error("Could not delete template", e.message),
  });

  const allTemplates = (data?.templates ?? []) as RecurringRow[];
  const templates = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return allTemplates.filter((t) => {
      if (filters.locationId && t.locationId !== filters.locationId) return false;
      if (term) {
        const hay = `${t.name} ${t.locationName ?? ""} ${t.frequency ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allTemplates, filters]);

  const kpis = useMemo(() => {
    const now = new Date();
    const active = templates.filter((t) => t.active !== false).length;
    const paused = templates.filter((t) => t.active === false).length;
    const dueSoon = templates.filter((t) => {
      if (t.active === false) return false;
      const days = daysUntil(t.nextRunDate, now);
      return days != null && days >= 0 && days <= 7;
    }).length;

    let monthlyValue: number | null = null;
    let anyAmount = false;
    let sum = 0;
    for (const t of templates) {
      if (t.active === false) continue;
      const amt = templateAmount(t);
      if (amt == null) continue;
      anyAmount = true;
      sum += toMonthly(amt, t.frequency);
    }
    if (anyAmount) monthlyValue = sum;

    return { active, paused, dueSoon, monthlyValue };
  }, [templates]);

  const columns = useMemo<Column<RecurringRow>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r) => r.name,
        cell: (r) => (
          <span className="font-medium text-slate-900">{r.name}</span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (r) => r.locationName ?? r.locationId,
      },
      {
        id: "frequency",
        header: "Frequency",
        accessor: (r) => r.frequency,
        cell: (r) => <Chip>{humanize(r.frequency)}</Chip>,
      },
      {
        id: "nextRun",
        header: "Next run",
        accessor: (r) => {
          const d = toDate(r.nextRunDate);
          return d ? d.getTime() : 0;
        },
        cell: (r) => {
          const days = daysUntil(r.nextRunDate);
          return (
            <div>
              <div className="text-slate-900">{shortDate(r.nextRunDate)}</div>
              {days != null ? (
                <div className="text-[11px] text-slate-500">
                  {days < 0
                    ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                    : days === 0
                      ? "Today"
                      : `in ${days} day${days === 1 ? "" : "s"}`}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "autoGenerate",
        header: "Auto-generate",
        accessor: (r) => (r.autoGenerate ? "yes" : "no"),
        cell: (r) =>
          r.autoGenerate ? (
            <Chip tone="positive">Yes</Chip>
          ) : (
            <Chip>No</Chip>
          ),
      },
      {
        id: "autoSend",
        header: "Auto-send",
        accessor: (r) => (r.autoSend ? "yes" : "no"),
        cell: (r) =>
          r.autoSend ? <Chip tone="positive">Yes</Chip> : <Chip>No</Chip>,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => (r.active !== false ? "active" : "paused"),
        cell: (r) =>
          r.active !== false ? (
            <Chip tone="positive">Active</Chip>
          ) : (
            <Chip tone="pending">Paused</Chip>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        accessor: () => "",
        sortable: false,
        locked: true,
        cell: (r) =>
          manage ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={runMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  runMutation.mutate(r.id);
                }}
              >
                {runMutation.isPending && runMutation.variables === r.id ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Running…
                  </>
                ) : (
                  "Run now"
                )}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this recurring template?")) {
                    deleteMutation.mutate(r.id);
                  }
                }}
              >
                {deleteMutation.isPending && deleteMutation.variables === r.id ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          ) : null,
      },
    ],
    [
      manage,
      runMutation.isPending,
      runMutation.variables,
      deleteMutation.isPending,
      deleteMutation.variables,
    ],
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
          <ArFilterBar
            showDateRange={false}
            showStatus={false}
            showPaymentStatus={false}
            searchPlaceholder="Search recurring templates…"
          />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: kpis.monthlyValue != null ? 4 : 3 }).map(
            (_, i) => (
              <KpiCardSkeleton key={i} />
            ),
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Active templates"
            value={count(kpis.active)}
            icon={PlayCircle}
            accent="green"
            changePct={null}
          />
          <KpiCard
            label="Paused"
            value={count(kpis.paused)}
            icon={PauseCircle}
            accent="slate"
            changePct={null}
          />
          <KpiCard
            label="Due in next 7 days"
            value={count(kpis.dueSoon)}
            icon={CalendarClock}
            accent="orange"
            changePct={null}
            upIsGood={false}
          />
          {kpis.monthlyValue != null ? (
            <KpiCard
              label="Estimated monthly value"
              value={money(kpis.monthlyValue)}
              icon={RefreshCw}
              accent="purple"
              changePct={null}
            />
          ) : null}
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Recurring invoices"
          description="Automated invoice templates on a schedule"
          action={
            manage ? (
              <Button
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setModalOpen(true);
                }}
              >
                New template
              </Button>
            ) : undefined
          }
        />
        <PanelBody className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            rows={templates}
            getRowId={(r) => r.id}
            loading={isLoading}
            searchable={false}
            exportFileName="accounts-recurring"
            emptyTitle="No recurring templates match your filters"
            emptyDescription="Create a template to automatically generate invoices on a schedule."
            initialSort={{ id: "nextRun", dir: "asc" }}
          />
        </PanelBody>
      </Panel>

      <Modal
        open={modalOpen}
        title="New recurring template"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            <Select
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {humanize(f)}
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
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !name.trim() ||
                !locationId ||
                !itemName.trim() ||
                createMutation.isPending
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
