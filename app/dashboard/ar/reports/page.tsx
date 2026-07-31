"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { fetchArReport, moneyFmt } from "@/lib/queries/ar";

const REPORT_TYPES = [
  { value: "aging", label: "Aging" },
  { value: "revenue", label: "Revenue" },
  { value: "collections", label: "Collections" },
  { value: "outstanding", label: "Outstanding balances" },
  { value: "invoice-summary", label: "Invoice summary" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCell(key: string, value: unknown): string {
  if (value == null) return "—";
  if (
    typeof value === "number" &&
    /amount|total|balance|revenue|collected|paid|due/i.test(key)
  ) {
    return moneyFmt(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ArReportsPage() {
  const [reportType, setReportType] = useState("aging");
  const [csvLoading, setCsvLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ar", "report", reportType],
    queryFn: () => fetchArReport(reportType) as Promise<Record<string, unknown>>,
    enabled: false,
  });

  const rows = Array.isArray(data?.rows)
    ? (data.rows as Record<string, unknown>[])
    : Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : data && typeof data === "object"
        ? [data]
        : [];

  const columns =
    rows.length > 0
      ? Object.keys(rows[0])
      : [];

  async function handleRun() {
    setError(null);
    refetch();
  }

  async function handleCsvDownload() {
    setCsvLoading(true);
    setError(null);
    try {
      const blob = (await fetchArReport(reportType, { format: "csv" })) as Blob;
      downloadBlob(blob, `ar-${reportType}.csv`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Reports" description="AR analytics and exportable reports" />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Report type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="min-w-[200px]"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Button onClick={handleRun} disabled={isFetching}>
              {isFetching ? "Loading…" : "Run report"}
            </Button>
            <Button variant="secondary" onClick={handleCsvDownload} disabled={csvLoading}>
              {csvLoading ? "Downloading…" : "Download CSV"}
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {isLoading || isFetching ? (
            <p className="text-sm text-slate-500">Loading report…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">Run a report to see results.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 font-medium">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-3 text-slate-700">
                          {formatCell(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && rows.length === 0 && !isLoading ? (
            <pre className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
