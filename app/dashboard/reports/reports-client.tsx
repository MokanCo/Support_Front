"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";

type Period = "daily" | "monthly" | "yearly";

async function download(period: Period) {
  const res = await apiFetch(`/api/reports/tickets?period=${period}`);
  if (!res.ok) return;
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  const nameMatch = cd?.match(/filename="([^"]+)"/);
  const filename = nameMatch?.[1] ?? `tickets-report-${period}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const REPORTS: { period: Period; label: string }[] = [
  { period: "daily", label: "Daily report" },
  { period: "monthly", label: "Monthly report" },
  { period: "yearly", label: "Yearly report" },
];

export function ReportsClient() {
  const [downloadingPeriod, setDownloadingPeriod] = useState<Period | null>(null);

  async function handleDownload(period: Period) {
    setDownloadingPeriod(period);
    try {
      await download(period);
    } finally {
      setDownloadingPeriod(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Export ticket activity for the current calendar window (daily, monthly, or yearly).
        </p>
      </div>

      <Card>
        <CardHeader
          title="CSV exports"
          description="Downloads include ticket ID, title, status, priority, progress, deadline, location, timestamps, and assignment."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {REPORTS.map(({ period, label }) => {
              const busy = downloadingPeriod === period;
              return (
                <Button
                  key={period}
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={busy}
                  onClick={() => void handleDownload(period)}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {busy ? "Downloading…" : label}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">
            Daily: since midnight today · Monthly: since the 1st of this month · Yearly: since Jan 1
            this year. Scope respects your role (partners export their location only).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
