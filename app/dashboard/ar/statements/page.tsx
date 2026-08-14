"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { fetchArStatements, generateArStatement, moneyFmt } from "@/lib/queries/ar";

export default function ArStatementsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
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
      setModalOpen(false);
      setLocationId("");
      setPeriodStart("");
      setPeriodEnd("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const statements = data?.statements ?? [];

  function cell(v: unknown) {
    if (v == null) return "—";
    if (typeof v === "number") return moneyFmt(v);
    return String(v);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Statements"
          description="Partner account statements by billing period"
          action={
            manage ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Generate statement
              </Button>
            ) : undefined
          }
        />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading statements…</p>
          ) : statements.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No statements yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Period start</th>
                  <th className="px-6 py-3 font-medium">Period end</th>
                  <th className="px-6 py-3 font-medium">Opening</th>
                  <th className="px-6 py-3 font-medium">Closing</th>
                  <th className="px-6 py-3 font-medium">Generated</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s, i) => (
                  <tr key={String(s.id ?? i)} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {cell(s.locationName ?? s.locationId)}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {cell(String(s.periodStart ?? "").slice(0, 10))}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {cell(String(s.periodEnd ?? "").slice(0, 10))}
                    </td>
                    <td className="px-6 py-3 text-slate-900">{cell(s.openingBalance)}</td>
                    <td className="px-6 py-3 text-slate-900">{cell(s.closingBalance)}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {cell(String(s.createdAt ?? "").slice(0, 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

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
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
