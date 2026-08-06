"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  FileText,
  ScrollText,
  Wallet,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { Amount, ErrorState } from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { count, money, shortDate, toDate } from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import { fetchArStatements, generateArStatement } from "@/lib/queries/ar";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { useSession } from "@/lib/session-context";

type StatementRow = Record<string, unknown>;

function pick(row: StatementRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return undefined;
}

function pickNum(row: StatementRow, keys: string[]): number | null {
  const raw = pick(row, keys);
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hasNumericField(rows: StatementRow[], keys: string[]): boolean {
  return rows.some((r) => pickNum(r, keys) != null);
}

const INVOICED_KEYS = [
  "invoiced",
  "invoicedAmount",
  "totalInvoiced",
  "charges",
  "totalCharges",
  "periodCharges",
];
const PAID_KEYS = [
  "paid",
  "paidAmount",
  "totalPaid",
  "payments",
  "totalPayments",
  "amountPaid",
  "periodPayments",
];

export default function ArStatementsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ar", "statements"],
    queryFn: () => fetchArStatements({ pageSize: 200 }),
  });

  const locationsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: manage && modalOpen,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateArStatement({
        locationId,
        periodStart,
        periodEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "statements"] });
      toast.success("Statement generated");
      setModalOpen(false);
      setLocationId("");
      setPeriodStart("");
      setPeriodEnd("");
      setFormError(null);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      toast.error("Could not generate statement", e.message);
    },
  });

  const statements = (data?.statements ?? []) as StatementRow[];
  const canDeriveInvoiced = hasNumericField(statements, INVOICED_KEYS);

  const kpis = useMemo(() => {
    const issued = statements.length;
    const periods = new Set(
      statements.map((s) => {
        const start = String(pick(s, ["periodStart", "startDate", "from"]) ?? "");
        const end = String(pick(s, ["periodEnd", "endDate", "to"]) ?? "");
        return `${start}|${end}`;
      }),
    );
    const periodCount = [...periods].filter((p) => p !== "|").length;

    let totalValue: number | null = null;
    if (canDeriveInvoiced) {
      totalValue = statements.reduce(
        (sum, s) => sum + (pickNum(s, INVOICED_KEYS) ?? 0),
        0,
      );
    }

    const outstanding = statements.reduce((sum, s) => {
      const closing = pickNum(s, ["closingBalance", "closing", "balance"]);
      return sum + (closing ?? 0);
    }, 0);

    return { issued, periodCount, totalValue, outstanding };
  }, [statements, canDeriveInvoiced]);

  const columns = useMemo<Column<StatementRow>[]>(
    () => [
      {
        id: "period",
        header: "Period",
        accessor: (r) => {
          const start = pick(r, ["periodStart", "startDate", "from"]);
          const a = toDate(start);
          return a ? a.getTime() : 0;
        },
        cell: (r) => {
          const start = pick(r, ["periodStart", "startDate", "from"]);
          const end = pick(r, ["periodEnd", "endDate", "to"]);
          if (!start && !end) return "—";
          return `${shortDate(start)} – ${shortDate(end)}`;
        },
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (r) =>
          String(pick(r, ["locationName", "customerName", "locationId"]) ?? ""),
        cell: (r) => (
          <span className="font-medium text-slate-900">
            {String(
              pick(r, ["locationName", "customerName"]) ??
                pick(r, ["locationId"]) ??
                "—",
            )}
          </span>
        ),
      },
      {
        id: "opening",
        header: "Opening balance",
        accessor: (r) => pickNum(r, ["openingBalance", "opening"]) ?? 0,
        align: "right",
        cell: (r) => (
          <Amount value={pickNum(r, ["openingBalance", "opening"]) ?? 0} />
        ),
      },
      {
        id: "invoiced",
        header: "Invoiced",
        accessor: (r) => pickNum(r, INVOICED_KEYS) ?? 0,
        align: "right",
        cell: (r) => {
          const n = pickNum(r, INVOICED_KEYS);
          return n == null ? "—" : <Amount value={n} />;
        },
      },
      {
        id: "paid",
        header: "Paid",
        accessor: (r) => pickNum(r, PAID_KEYS) ?? 0,
        align: "right",
        cell: (r) => {
          const n = pickNum(r, PAID_KEYS);
          return n == null ? "—" : <Amount value={n} />;
        },
      },
      {
        id: "closing",
        header: "Closing balance",
        accessor: (r) =>
          pickNum(r, ["closingBalance", "closing", "balance"]) ?? 0,
        align: "right",
        cell: (r) => (
          <Amount
            value={pickNum(r, ["closingBalance", "closing", "balance"]) ?? 0}
          />
        ),
      },
      {
        id: "generated",
        header: "Generated on",
        accessor: (r) => {
          const d = toDate(
            pick(r, ["createdAt", "generatedAt", "generatedOn", "issuedAt"]),
          );
          return d ? d.getTime() : 0;
        },
        cell: (r) =>
          shortDate(
            pick(r, ["createdAt", "generatedAt", "generatedOn", "issuedAt"]),
          ),
      },
    ],
    [],
  );

  if (error) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Statements issued"
            value={count(kpis.issued)}
            icon={ScrollText}
            accent="blue"
            changePct={null}
          />
          <KpiCard
            label="Period covered"
            value={count(kpis.periodCount)}
            icon={CalendarRange}
            accent="indigo"
            changePct={null}
          />
          {kpis.totalValue != null ? (
            <KpiCard
              label="Total statement value"
              value={money(kpis.totalValue)}
              icon={FileText}
              accent="purple"
              changePct={null}
            />
          ) : null}
          <KpiCard
            label="Outstanding on statements"
            value={money(kpis.outstanding)}
            icon={Wallet}
            accent="orange"
            changePct={null}
            upIsGood={false}
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Statements"
          description="Partner account statements by billing period"
          action={
            manage ? (
              <Button
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setModalOpen(true);
                }}
              >
                Generate statement
              </Button>
            ) : undefined
          }
        />
        <PanelBody className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            rows={statements}
            getRowId={(r) =>
              String(
                pick(r, ["id"]) ??
                  `${pick(r, ["locationId"])}-${pick(r, ["periodStart"])}-${pick(r, ["periodEnd"])}`,
              )
            }
            loading={isLoading}
            searchPlaceholder="Search statements…"
            exportFileName="accounts-statements"
            emptyTitle="No statements yet"
            emptyDescription="Generated partner statements will appear here."
            initialSort={{ id: "generated", dir: "desc" }}
          />
        </PanelBody>
      </Panel>

      <Modal open={modalOpen} title="Generate statement" onClose={() => setModalOpen(false)}>
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
            label="Period start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
          <Input
            label="Period end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !locationId || !periodStart || !periodEnd || generateMutation.isPending
              }
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
