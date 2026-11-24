"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { Chip, ErrorState } from "@/components/ar/ui/primitives";
import { humanize, shortDate, toDate } from "@/lib/ar/format";
import { fetchArAuditLogs } from "@/lib/queries/ar";

type AuditRow = Record<string, unknown>;

function pick(row: AuditRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return undefined;
}

function cellText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatWhen(value: unknown): string {
  const d = toDate(value);
  if (!d) return "—";
  const date = shortDate(d);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export default function ArAuditPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ar", "audit-logs"],
    queryFn: () => fetchArAuditLogs({ pageSize: 200 }),
  });

  const logs = (data?.logs ?? []) as AuditRow[];

  const columns = useMemo<Column<AuditRow>[]>(
    () => [
      {
        id: "when",
        header: "When",
        accessor: (r) => {
          const d = toDate(pick(r, ["createdAt", "timestamp", "occurredAt", "at"]));
          return d ? d.getTime() : 0;
        },
        cell: (r) => (
          <span className="whitespace-nowrap text-slate-700">
            {formatWhen(pick(r, ["createdAt", "timestamp", "occurredAt", "at"]))}
          </span>
        ),
      },
      {
        id: "actor",
        header: "Actor",
        accessor: (r) =>
          cellText(
            pick(r, [
              "userName",
              "actorName",
              "actor",
              "userEmail",
              "userId",
              "actorId",
            ]),
          ),
        cell: (r) => (
          <span className="font-medium text-slate-900">
            {cellText(
              pick(r, [
                "userName",
                "actorName",
                "actor",
                "userEmail",
                "userId",
                "actorId",
              ]),
            )}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        accessor: (r) =>
          String(pick(r, ["action", "eventType", "event", "type"]) ?? ""),
        cell: (r) => {
          const action = pick(r, ["action", "eventType", "event", "type"]);
          return <Chip>{humanize(action)}</Chip>;
        },
      },
      {
        id: "entity",
        header: "Entity",
        accessor: (r) =>
          String(pick(r, ["entityType", "resourceType", "entity", "resource"]) ?? ""),
        cell: (r) =>
          cellText(
            pick(r, ["entityType", "resourceType", "entity", "resource"]),
          ),
      },
      {
        id: "entityId",
        header: "Entity ID",
        accessor: (r) =>
          String(pick(r, ["entityId", "resourceId", "targetId"]) ?? ""),
        cell: (r) => {
          const id = pick(r, ["entityId", "resourceId", "targetId"]);
          if (id == null) return "—";
          return (
            <span className="font-mono text-xs text-slate-600">
              {String(id)}
            </span>
          );
        },
      },
      {
        id: "details",
        header: "Details",
        accessor: (r) =>
          cellText(pick(r, ["details", "description", "metadata", "message"])),
        cell: (r) => (
          <span className="line-clamp-2 max-w-md text-xs text-slate-500">
            {cellText(pick(r, ["details", "description", "metadata", "message"]))}
          </span>
        ),
      },
      {
        id: "ip",
        header: "IP",
        accessor: (r) =>
          String(pick(r, ["ip", "ipAddress", "clientIp", "remoteAddress"]) ?? ""),
        cell: (r) =>
          cellText(pick(r, ["ip", "ipAddress", "clientIp", "remoteAddress"])),
        defaultHidden: true,
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
      <Panel padded={false}>
        <PanelHeader
          title="Audit logs"
          description="AR activity and change history"
        />
        <PanelBody className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            rows={logs}
            getRowId={(r) =>
              String(
                pick(r, ["id"]) ??
                  `${pick(r, ["createdAt", "timestamp"])}-${pick(r, ["action", "eventType"])}-${pick(r, ["entityId", "userId"])}`,
              )
            }
            loading={isLoading}
            searchable
            searchPlaceholder="Search audit logs…"
            exportFileName="accounts-audit-logs"
            emptyTitle="No audit logs yet"
            emptyDescription="Account activity will appear here as changes are made."
            initialSort={{ id: "when", dir: "desc" }}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
