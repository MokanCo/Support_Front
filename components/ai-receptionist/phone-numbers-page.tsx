"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import {
  fetchReceptionistLocations,
  receptionistLocationsQueryKey,
} from "@/components/ai-receptionist/locations";
import {
  DataTableShell,
  EmptyRow,
  FilterField,
  PageIntro,
  StageNotice,
  StatusPill,
  fieldClass,
} from "@/components/ai-receptionist/ui";
import {
  DAY_LABEL,
  PROVIDERS,
  TIMEZONES,
  blankSchedule,
  createPhoneNumber,
  deletePhoneNumber,
  fetchPhoneNumbers,
  forwardingLabel,
  hoursLabel,
  providerLabel,
  testPhoneNumber,
  updatePhoneNumber,
  type BranchPhoneNumber,
  type ForwardingStatus,
  type ForwardMode,
  type PhoneNumberTestResult,
  type PhoneProvider,
  type ScheduleRow,
} from "@/lib/queries/phone-numbers";

const COLUMNS = [
  "Branch",
  "Public number",
  "AI destination",
  "Provider",
  "Assigned branch",
  "AI",
  "Business hours",
  "Human fallback",
  "Transfer number",
  "Forwarding",
  "Connection",
  "Actions",
];

type FormState = {
  locationId: string;
  existingPhoneNumber: string;
  aiDestinationNumber: string;
  provider: PhoneProvider;
  providerLabel: string;
  aiEnabled: boolean;
  timezone: string;
  schedule: ScheduleRow[];
  humanFallbackNumber: string;
  transferNumber: string;
  forwardingMode: ForwardMode;
  forwardingStatus: ForwardingStatus;
  forwardingDestination: string;
  forwardingNotes: string;
};

function emptyForm(): FormState {
  return {
    locationId: "",
    existingPhoneNumber: "",
    aiDestinationNumber: "",
    provider: "unknown",
    providerLabel: "",
    aiEnabled: false,
    timezone: "America/New_York",
    schedule: blankSchedule(),
    humanFallbackNumber: "",
    transferNumber: "",
    forwardingMode: "none",
    forwardingStatus: "not_configured",
    forwardingDestination: "",
    forwardingNotes: "",
  };
}

function formFromRecord(row: BranchPhoneNumber): FormState {
  const schedule = blankSchedule().map((day) => {
    const found = row.businessHours.schedule.find((item) => item.day === day.day);
    return found ?? day;
  });
  return {
    locationId: row.locationId,
    existingPhoneNumber: row.existingPhoneNumber,
    aiDestinationNumber: row.aiDestinationNumber || "",
    provider: row.provider,
    providerLabel: row.providerLabel,
    aiEnabled: row.aiEnabled,
    timezone: row.businessHours.timezone || "America/New_York",
    schedule,
    humanFallbackNumber: row.humanFallbackNumber,
    transferNumber: row.transferNumber,
    forwardingMode: row.forwarding.mode,
    forwardingStatus: row.forwarding.status || "not_configured",
    forwardingDestination: row.forwarding.destination,
    forwardingNotes: row.forwarding.notes,
  };
}

export function PhoneNumbersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchPhoneNumber | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<BranchPhoneNumber | null>(null);
  const [testResult, setTestResult] = useState<PhoneNumberTestResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, branchId]);

  const locations = useQuery({
    queryKey: receptionistLocationsQueryKey,
    queryFn: fetchReceptionistLocations,
  });

  const list = useQuery({
    queryKey: ["ai-receptionist", "phone-numbers", { page, search, branchId }],
    queryFn: () =>
      fetchPhoneNumbers({
        page,
        pageSize: 10,
        search,
        locationId: branchId,
      }),
  });

  const locationPhone = useMemo(() => {
    return locations.data?.find((location) => location.id === form.locationId)?.phone ?? "";
  }, [form.locationId, locations.data]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(row: BranchPhoneNumber) {
    setEditing(row);
    setForm(formFromRecord(row));
    setFormError("");
    setFormOpen(true);
  }

  function onBranchChange(locationId: string) {
    const location = locations.data?.find((item) => item.id === locationId);
    setForm((current) => {
      const untouched =
        !current.existingPhoneNumber || current.existingPhoneNumber === locationPhone;
      return {
        ...current,
        locationId,
        existingPhoneNumber:
          !editing && untouched ? location?.phone ?? "" : current.existingPhoneNumber,
      };
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        locationId: form.locationId,
        existingPhoneNumber: form.existingPhoneNumber,
        aiDestinationNumber: form.aiDestinationNumber,
        provider: form.provider,
        providerLabel: form.providerLabel,
        aiEnabled: form.aiEnabled,
        businessHours: { timezone: form.timezone, schedule: form.schedule },
        humanFallbackNumber: form.humanFallbackNumber,
        transferNumber: form.transferNumber,
        forwarding: {
          mode: form.forwardingMode,
          status: form.forwardingMode === "none" ? "not_configured" : form.forwardingStatus,
          destination: form.forwardingMode === "none" ? "" : form.forwardingDestination || form.aiDestinationNumber,
          notes: form.forwardingNotes,
          routingLive: false as const,
        },
      };
      if (editing) return updatePhoneNumber(editing.id, body);
      return createPhoneNumber(body);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "phone-numbers"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePhoneNumber(id),
    onSuccess: async () => {
      setRemoveTarget(null);
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "phone-numbers"] });
    },
    onError: (error: Error) => {
      setRemoveTarget(null);
      setPageError(error.message);
    },
  });

  const test = useMutation({
    mutationFn: (id: string) => testPhoneNumber(id),
    onSuccess: async (result) => {
      setTestResult(result);
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "phone-numbers"] });
    },
    onError: (error: Error) => setPageError(error.message),
  });

  const rows = list.data?.phoneNumbers ?? [];
  const totalPages = list.data?.totalPages ?? 1;

  return (
    <div>
      <PageIntro
        title="Branch Phone Numbers"
        description="Customers keep calling each franchise number. The carrier forwards that call to the Bandwidth AI destination. Saving here does not change the carrier."
      />
      <StageNotice>
        Saving a number stores it in the portal only. It does not forward, port, test-dial, or disconnect the carrier line. Live routing stays off.
      </StageNotice>

      <Card className="overflow-hidden">
        <CardHeader
          title="Numbers"
          description="One configuration per incoming number. Several numbers can belong to the same branch."
          action={
            <Button type="button" onClick={openCreate}>
              Add phone number
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <FilterField label="Search">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Branch or number"
                className={fieldClass}
              />
            </FilterField>
            <FilterField label="Branch">
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className={fieldClass}
              >
                <option value="all">All branches</option>
                {(locations.data ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          {pageError ? <p className="text-sm text-red-600">{pageError}</p> : null}
          {list.isLoading ? (
            <p className="text-sm text-slate-500">Loading phone numbers…</p>
          ) : list.isError ? (
            <p className="text-sm text-red-600">
              {(list.error as Error).message || "Could not load phone numbers."}
            </p>
          ) : (
            <DataTableShell columns={COLUMNS}>
              {rows.length === 0 ? (
                <EmptyRow
                  colSpan={COLUMNS.length}
                  message="No phone configurations are stored yet. Add one to record the branch, hours, and fallback. The carrier number stays as it is."
                />
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {row.branchName || "Unknown branch"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.existingPhoneNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.aiDestinationNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{providerLabel(row)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.branchName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={row.aiEnabled ? "positive" : "neutral"}>
                        {row.aiEnabled ? "Enabled" : "Disabled"}
                      </StatusPill>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{hoursLabel(row.businessHours)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {row.humanFallbackNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {row.transferNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {forwardingLabel(row.forwarding)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone="warning">Not connected</StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={test.isPending}
                          onClick={() => test.mutate(row.id)}
                        >
                          Test
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(row)}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </DataTableShell>
          )}

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {list.data ? `${list.data.total} configuration${list.data.total === 1 ? "" : "s"}` : ""}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="px-2 py-1.5">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={formOpen}
        size="xl"
        title={editing ? "Edit phone number" : "Add phone number"}
        description="This saves portal configuration only. The location record and the carrier are left unchanged."
        onClose={() => setFormOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError("");
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Assigned branch"
              value={form.locationId}
              required
              onChange={(event) => onBranchChange(event.target.value)}
            >
              <option value="">Select a branch</option>
              {(locations.data ?? []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Public branch number</span>
              <input
                required
                value={form.existingPhoneNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, existingPhoneNumber: event.target.value }))
                }
                placeholder="+13132304482"
                className={fieldClass}
              />
              {locationPhone ? (
                <span className="block text-xs text-slate-500">
                  Location record: {locationPhone}. Changing the field above does not edit that record.
                </span>
              ) : null}
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">AI destination number</span>
              <input
                value={form.aiDestinationNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, aiDestinationNumber: event.target.value }))
                }
                placeholder="+13376040529"
                className={fieldClass}
              />
              <span className="block text-xs text-slate-500">
                Bandwidth number that receives the forwarded call. This does not replace the public number.
              </span>
            </label>
            <Select
              label="Carrier provider"
              value={form.provider}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  provider: event.target.value as PhoneProvider,
                }))
              }
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </Select>
            {form.provider === "other" ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Provider name</span>
                <input
                  required
                  value={form.providerLabel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, providerLabel: event.target.value }))
                  }
                  className={fieldClass}
                />
              </label>
            ) : (
              <label className="flex items-end gap-3 pb-2">
                <input
                  type="checkbox"
                  checked={form.aiEnabled}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, aiEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-primary-700"
                />
                <span className="text-sm text-slate-700">
                  AI handling enabled when telephony is connected
                </span>
              </label>
            )}
            {form.provider === "other" ? (
              <label className="flex items-center gap-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.aiEnabled}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, aiEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-primary-700"
                />
                <span className="text-sm text-slate-700">
                  AI handling enabled when telephony is connected
                </span>
              </label>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Human fallback number</span>
              <input
                value={form.humanFallbackNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, humanFallbackNumber: event.target.value }))
                }
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Call transfer number</span>
              <input
                value={form.transferNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, transferNumber: event.target.value }))
                }
                className={fieldClass}
              />
            </label>
            <Select
              label="Forwarding"
              value={form.forwardingMode}
              onChange={(event) => {
                const mode = event.target.value as ForwardMode;
                setForm((current) => ({
                  ...current,
                  forwardingMode: mode,
                  forwardingStatus: mode === "none" ? "not_configured" : current.forwardingStatus === "not_configured" ? "pending" : current.forwardingStatus,
                  forwardingDestination:
                    mode === "forward" && !current.forwardingDestination
                      ? current.aiDestinationNumber
                      : current.forwardingDestination,
                }));
              }}
            >
              <option value="none">Not configured</option>
              <option value="forward">Carrier forwarding</option>
              <option value="sip">SIP forwarding</option>
              <option value="manual">Manual configuration</option>
            </Select>
            {form.forwardingMode !== "none" ? (
              <Select
                label="Forwarding status"
                value={form.forwardingStatus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    forwardingStatus: event.target.value as ForwardingStatus,
                  }))
                }
              >
                <option value="not_configured">Not configured</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
              </Select>
            ) : null}
            {form.forwardingMode === "forward" || form.forwardingMode === "sip" ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  {form.forwardingMode === "sip" ? "SIP destination" : "Forward-to number"}
                </span>
                <input
                  value={form.forwardingDestination}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      forwardingDestination: event.target.value,
                    }))
                  }
                  placeholder={form.forwardingMode === "sip" ? "sip:user@host" : form.aiDestinationNumber || "+13376040529"}
                  className={fieldClass}
                />
              </label>
            ) : null}
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Saving this form does not turn on call forwarding at the phone company. Ask the carrier to forward the public branch number to the AI destination number, then set the status here.
          </p>

          {form.forwardingMode === "manual" || form.forwardingMode === "forward" ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                {form.forwardingMode === "forward" ? "Carrier setup notes" : "Forwarding notes"}
              </span>
              <textarea
                value={form.forwardingNotes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, forwardingNotes: event.target.value }))
                }
                rows={3}
                maxLength={500}
                className={fieldClass}
              />
            </label>
          ) : null}

          <div>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">Business hours</p>
              <label className="block min-w-[14rem] space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Timezone</span>
                <select
                  value={form.timezone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, timezone: event.target.value }))
                  }
                  className={fieldClass}
                >
                  {TIMEZONES.includes(form.timezone) ? null : (
                    <option value={form.timezone}>{form.timezone}</option>
                  )}
                  {TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              {form.schedule.map((row) => (
                <div key={row.day} className="grid grid-cols-[4.5rem_5.5rem_1fr_1fr] items-center gap-2">
                  <span className="text-sm text-slate-700">{DAY_LABEL[row.day]}</span>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={row.closed}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          schedule: current.schedule.map((item) =>
                            item.day === row.day
                              ? {
                                  ...item,
                                  closed: event.target.checked,
                                  open: event.target.checked ? "" : item.open,
                                  close: event.target.checked ? "" : item.close,
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                    Closed
                  </label>
                  <input
                    type="time"
                    disabled={row.closed}
                    value={row.open}
                    aria-label={`${DAY_LABEL[row.day]} open`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        schedule: current.schedule.map((item) =>
                          item.day === row.day ? { ...item, open: event.target.value } : item,
                        ),
                      }))
                    }
                    className={fieldClass}
                  />
                  <input
                    type="time"
                    disabled={row.closed}
                    value={row.close}
                    aria-label={`${DAY_LABEL[row.day]} close`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        schedule: current.schedule.map((item) =>
                          item.day === row.day ? { ...item, close: event.target.value } : item,
                        ),
                      }))
                    }
                    className={fieldClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !form.locationId}>
              {save.isPending ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(removeTarget)}
        title="Remove phone configuration"
        message="This deletes the portal record only. The branch and its carrier number stay in place."
        confirmLabel={remove.isPending ? "Removing…" : "Remove"}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) remove.mutate(removeTarget.id);
        }}
      />

      <Modal
        open={Boolean(testResult)}
        title="Connection test"
        description="No call was placed."
        onClose={() => setTestResult(null)}
      >
        <p className="text-sm leading-6 text-slate-700">{testResult?.test.message}</p>
        <p className="mt-3 text-sm text-slate-500">
          Carrier routing was not changed. Status remains not connected.
        </p>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setTestResult(null)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
