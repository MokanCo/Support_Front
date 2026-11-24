"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileDown,
  FileSpreadsheet,
  Printer,
  Server,
  Table2,
} from "lucide-react";
import {
  AreaTrendChart,
  BarTrendChart,
  DonutChart,
  HorizontalBarChart,
  RevenueTreemap,
} from "@/components/ar/ui/charts";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  Amount,
  Chip,
  ErrorState,
  SkeletonChart,
  StatusBadge,
} from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import {
  filterCredits,
  filterInvoices,
  filterPayments,
  useArDataset,
} from "@/lib/ar/dataset";
import { describeRange, useArFilters } from "@/lib/ar/filters";
import { count, money, ratio, shortDate } from "@/lib/ar/format";
import { exportCsv, exportExcel, printReport } from "@/lib/ar/export";
import {
  asPayableReport,
  buildReport,
  reportsForRole,
  type ReportColumn,
  type ReportRow,
} from "@/lib/ar/reports";
import { ACCENTS } from "@/lib/ar/theme";
import { fetchArReport } from "@/lib/queries/ar";
import {
  fetchLocationsList,
  type LocationRow,
} from "@/lib/queries/locations";
import { canFetchLocationDirectory } from "@/lib/permissions";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/Button";

/** Formats a raw report cell for display based on the column's declared kind. */
function renderCell(column: ReportColumn, value: ReportRow[string]) {
  if (value == null || value === "") return <span className="text-slate-400">—</span>;
  switch (column.kind) {
    case "money":
      return <Amount value={Number(value)} />;
    case "number":
      return <span className="tabular-nums text-slate-700">{count(value)}</span>;
    case "percent":
      return <span className="tabular-nums text-slate-700">{ratio(Number(value))}</span>;
    case "days":
      return (
        <span className="tabular-nums text-slate-700">
          {count(value)} {Number(value) === 1 ? "day" : "days"}
        </span>
      );
    case "date":
      return <span className="text-slate-600">{shortDate(value)}</span>;
    case "status":
      return <StatusBadge status={String(value)} />;
    default:
      return <span className="text-slate-700">{String(value)}</span>;
  }
}

/** Plain-text version of a cell, used by CSV / Excel exports. */
function exportCell(column: ReportColumn, value: ReportRow[string]) {
  if (value == null || value === "") return "";
  switch (column.kind) {
    case "money":
      return money(value);
    case "percent":
      return ratio(Number(value));
    case "date":
      return shortDate(value);
    default:
      return String(value);
  }
}

export default function AccountsReportsPage() {
  const { filters } = useArFilters();
  const { user } = useSession();
  const toast = useArToast();
  const { data, isLoading, error, refetch } = useArDataset();
  const isPartner = user.role === "partner";
  const catalog = reportsForRole(user.role);
  const [reportId, setReportId] = useState(catalog[0].id);
  const [serverBusy, setServerBusy] = useState(false);

  const definition = catalog.find((r) => r.id === reportId) ?? catalog[0];

  const { data: locations = [] } = useQuery<LocationRow[]>({
    queryKey: ["ar", "report-locations"],
    queryFn: async () => {
      const res = await fetchLocationsList({
        page: 1,
        pageSize: 200,
        sort: "name",
        order: "asc",
      });
      return res.locations;
    },
    enabled: canFetchLocationDirectory(user.role),
    staleTime: 5 * 60_000,
  });

  const report = useMemo(() => {
    const now = new Date();
    const built = buildReport(reportId, {
      invoices: filterInvoices(data.invoices, filters, now),
      payments: filterPayments(data.payments, filters, data.invoices, now),
      credits: filterCredits(data.credits, filters),
      locations,
      now,
    });
    return isPartner ? asPayableReport(built) : built;
  }, [reportId, data, filters, locations, isPartner]);

  const tableColumns: Column<ReportRow>[] = useMemo(
    () =>
      report.columns.map((column) => ({
        id: column.id,
        header: column.header,
        align: column.align,
        defaultHidden: column.defaultHidden,
        accessor: (row) => {
          const value = row[column.id];
          if (value == null) return null;
          return typeof value === "number" ? value : String(value);
        },
        cell: (row) => renderCell(column, row[column.id]),
      })),
    [report.columns],
  );

  // DataTable needs a stable key; report rows are plain aggregates without ids.
  const tableRows = useMemo(
    () => report.rows.map((row, i) => ({ ...row, __rowId: `${reportId}-${i}` })),
    [report.rows, reportId],
  );

  const fileName = `accounts-${definition.id}`;
  const exportHeaders = report.columns.map((c) => c.header);
  const exportRows = report.rows.map((row) =>
    report.columns.map((c) => exportCell(c, row[c.id])),
  );

  async function handleServerCsv() {
    if (!definition.serverType) return;
    setServerBusy(true);
    try {
      const blob = (await fetchArReport(definition.serverType, {
        format: "csv",
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
      })) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}-server.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Server export ready", "Downloaded the full dataset from the API.");
    } catch (e) {
      toast.error("Server export failed", (e as Error).message);
    } finally {
      setServerBusy(false);
    }
  }

  if (error) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-5">
      <Panel className="ar-no-print" padded={false}>
        <PanelHeader
          title={isPartner ? "Payable reports" : "Report library"}
          description={
            isPartner
              ? "See what you’ve been billed and what you’ve paid — nothing to collect"
              : "Pick a report; every one respects the filters below"
          }
        />
        <PanelBody>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {catalog.map((item) => {
              const Icon = item.icon;
              const active = item.id === reportId;
              const accent = ACCENTS[item.accent];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReportId(item.id)}
                  className={`group flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : `${accent.border} ${accent.surface} hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)]`
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-white/15 text-white" : accent.icon
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-sm font-semibold ${
                        active ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] leading-snug ${
                        active ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </PanelBody>
      </Panel>

      {/* filters + exports */}
      <Panel className="ar-no-print sticky top-0 z-30" padded={false}>
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
          <ArFilterBar searchPlaceholder="Search within this report…" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportCsv(fileName, exportHeaders, exportRows)}
              disabled={!report.rows.length}
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                exportExcel(fileName, definition.label, exportHeaders, exportRows)
              }
              disabled={!report.rows.length}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={printReport}
              disabled={!report.rows.length}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / PDF
            </Button>
            {definition.serverType ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleServerCsv}
                disabled={serverBusy}
                title="Download the unfiltered dataset generated by the API"
              >
                <Server className="mr-1.5 h-3.5 w-3.5" />
                {serverBusy ? "Preparing…" : "Full export"}
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      {/* printable report surface */}
      <div className="ar-print-area space-y-5">
        <div className="hidden print:block">
          <h2 className="text-lg font-semibold text-slate-900">{definition.label}</h2>
          <p className="text-sm text-slate-500">
            {describeRange(filters)} · generated {shortDate(new Date())}
          </p>
        </div>

        {/* summary cards */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report.summary.map((card) => (
              <KpiCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                accent={card.accent}
                changePct={null}
                comparison={describeRange(filters)}
                hint={card.hint}
              />
            ))}
          </div>
        )}

        {/* chart */}
        {report.chart ? (
          <Panel padded={false}>
            <PanelHeader
              title={report.chartTitle}
              description={`${definition.label} · ${describeRange(filters)}`}
            />
            <PanelBody className="pt-2">
              {isLoading ? (
                <SkeletonChart />
              ) : report.chart.type === "area" ? (
                <AreaTrendChart
                  data={report.chart.data}
                  xKey={report.chart.xKey}
                  series={report.chart.series}
                  stacked={report.chart.stacked}
                />
              ) : report.chart.type === "bar" ? (
                <BarTrendChart
                  data={report.chart.data}
                  xKey={report.chart.xKey}
                  series={report.chart.series}
                  stacked={report.chart.stacked}
                />
              ) : report.chart.type === "hbar" ? (
                <HorizontalBarChart
                  data={report.chart.data}
                  color={report.chart.color}
                />
              ) : report.chart.type === "donut" ? (
                <DonutChart
                  data={report.chart.data}
                  valueFormatter={(n) => `${count(n)} invoices`}
                />
              ) : (
                <RevenueTreemap data={report.chart.data} />
              )}
            </PanelBody>
          </Panel>
        ) : null}

        {/* table */}
        <Panel padded={false}>
          <PanelHeader
            title={`${definition.label} detail`}
            description={`${count(report.rows.length)} row${
              report.rows.length === 1 ? "" : "s"
            } in ${describeRange(filters).toLowerCase()}`}
            icon={<Table2 className="h-4 w-4 text-slate-400" />}
            action={
              filters.locationId ? (
                <Chip tone="neutral">Filtered to one customer</Chip>
              ) : null
            }
          />
          <DataTable
            columns={tableColumns}
            rows={tableRows}
            getRowId={(row) => String(row.__rowId)}
            loading={isLoading}
            searchPlaceholder="Search rows…"
            pageSize={25}
            exportFileName={fileName}
            emptyTitle="No rows for these filters"
            emptyDescription="Widen the date range or clear a filter to see results."
          />
        </Panel>
      </div>
    </div>
  );
}
