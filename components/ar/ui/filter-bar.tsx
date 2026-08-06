"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import {
  DATE_PRESETS,
  INVOICE_STATUS_OPTIONS,
  PAYMENT_STATUSES,
  describeRange,
  useArFilters,
  type PaymentStatus,
} from "@/lib/ar/filters";
import { invoiceStatus } from "@/lib/ar/theme";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { useSession } from "@/lib/session-context";

const CONTROL =
  "h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5";

function Popover({
  label,
  value,
  icon,
  badge,
  children,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  badge?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className={`${CONTROL} inline-flex items-center gap-2 ${
          open ? "border-slate-300 ring-2 ring-slate-900/5" : ""
        }`}
      >
        {icon}
        <span className="max-w-[11rem] truncate">{value}</span>
        {badge ? (
          <span className="rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 z-40 mt-2 w-64 origin-top-left rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
          style={{ animation: "fadeIn 140ms ease-out both" }}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function OptionRow({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
    </button>
  );
}

/**
 * Global filter bar for the Accounts module. Every widget on a page reads the
 * same filter context, so one change here updates the whole screen.
 *
 * Note: locations, partners, and billed customers are the same entity in this
 * portal, so they are exposed as one "Customer / partner" control instead of
 * three dropdowns that would filter the identical field.
 */
export function ArFilterBar({
  showStatus = true,
  showPaymentStatus = true,
  showSearch = true,
  searchPlaceholder = "Search invoices, customers, references…",
}: {
  showStatus?: boolean;
  showPaymentStatus?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
}) {
  const { filters, setFilters, reset, activeCount } = useArFilters();
  const { user } = useSession();
  const isPartner = user.role === "partner";

  const { data: locations = [] } = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: !isPartner,
    staleTime: 5 * 60_000,
  });

  const selectedLocation = locations.find((l) => l.id === filters.locationId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* date range */}
      <Popover
        label="Date range"
        value={describeRange(filters)}
        icon={<CalendarDays className="h-4 w-4 text-slate-400" />}
      >
        {(close) => (
          <div className="space-y-1">
            {DATE_PRESETS.map((preset) => (
              <OptionRow
                key={preset.value}
                active={filters.preset === preset.value}
                onClick={() => {
                  setFilters({ preset: preset.value });
                  if (preset.value !== "custom") close();
                }}
              >
                {preset.label}
              </OptionRow>
            ))}
            {filters.preset === "custom" ? (
              <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  From
                  <input
                    type="date"
                    value={filters.from ? filters.from.slice(0, 10) : ""}
                    onChange={(e) => setFilters({ from: e.target.value })}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-slate-300"
                  />
                </label>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  To
                  <input
                    type="date"
                    value={filters.to ? filters.to.slice(0, 10) : ""}
                    onChange={(e) => setFilters({ to: e.target.value })}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-slate-300"
                  />
                </label>
              </div>
            ) : null}
          </div>
        )}
      </Popover>

      {/* customer / partner / location */}
      {!isPartner ? (
        <Popover
          label="Customer"
          value={selectedLocation?.name ?? "All customers"}
          icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
        >
          {(close) => (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              <OptionRow
                active={!filters.locationId}
                onClick={() => {
                  setFilters({ locationId: "" });
                  close();
                }}
              >
                All customers
              </OptionRow>
              {locations.map((loc) => (
                <OptionRow
                  key={loc.id}
                  active={filters.locationId === loc.id}
                  onClick={() => {
                    setFilters({ locationId: loc.id });
                    close();
                  }}
                >
                  {loc.name}
                </OptionRow>
              ))}
            </div>
          )}
        </Popover>
      ) : null}

      {/* invoice status (multi-select) */}
      {showStatus ? (
        <Popover
          label="Invoice status"
          value={
            filters.statuses.length === 0
              ? "All statuses"
              : filters.statuses.length === 1
                ? invoiceStatus(filters.statuses[0]).label
                : "Statuses"
          }
          badge={filters.statuses.length > 1 ? filters.statuses.length : undefined}
        >
          {() => (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              <OptionRow
                active={filters.statuses.length === 0}
                onClick={() => setFilters({ statuses: [] })}
              >
                All statuses
              </OptionRow>
              {INVOICE_STATUS_OPTIONS.map((status) => (
                <OptionRow
                  key={status}
                  active={filters.statuses.includes(status)}
                  onClick={() =>
                    setFilters({
                      statuses: filters.statuses.includes(status)
                        ? filters.statuses.filter((s) => s !== status)
                        : [...filters.statuses, status],
                    })
                  }
                >
                  {invoiceStatus(status).label}
                </OptionRow>
              ))}
            </div>
          )}
        </Popover>
      ) : null}

      {/* payment status */}
      {showPaymentStatus ? (
        <Popover
          label="Payment status"
          value={
            PAYMENT_STATUSES.find((p) => p.value === filters.paymentStatus)?.label ??
            "Any payment status"
          }
        >
          {(close) => (
            <div className="space-y-1">
              {PAYMENT_STATUSES.map((option) => (
                <OptionRow
                  key={option.value}
                  active={filters.paymentStatus === option.value}
                  onClick={() => {
                    setFilters({ paymentStatus: option.value as PaymentStatus });
                    close();
                  }}
                >
                  {option.label}
                </OptionRow>
              ))}
            </div>
          )}
        </Popover>
      ) : null}

      {/* search */}
      {showSearch ? (
        <div className="relative min-w-[190px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder={searchPlaceholder}
            className={`${CONTROL} w-full pl-9`}
          />
        </div>
      ) : null}

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset ({activeCount})
        </button>
      ) : null}
    </div>
  );
}
