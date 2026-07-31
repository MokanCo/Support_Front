"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fetchArAuditLogs } from "@/lib/queries/ar";

export default function ArAuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ar", "audit-logs"],
    queryFn: () => fetchArAuditLogs({ pageSize: 200 }),
  });

  const logs = data?.logs ?? [];

  function cell(v: unknown) {
    if (v == null) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Audit logs" description="AR activity and change history" />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading audit logs…</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{(error as Error).message}</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No audit logs yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Entity</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={String(log.id ?? i)} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                      {cell(String(log.createdAt ?? log.timestamp ?? "").slice(0, 19).replace("T", " "))}
                    </td>
                    <td className="px-6 py-3 text-slate-900">
                      {cell(log.userName ?? log.userEmail ?? log.userId)}
                    </td>
                    <td className="px-6 py-3 capitalize text-slate-700">
                      {cell(log.action ?? log.eventType)}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {cell(log.entityType ?? log.resourceType)}
                      {log.entityId ? ` · ${String(log.entityId).slice(0, 8)}…` : ""}
                    </td>
                    <td className="max-w-md truncate px-6 py-3 text-xs text-slate-500">
                      {cell(log.details ?? log.description ?? log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
