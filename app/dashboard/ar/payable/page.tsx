"use client";

import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  FileSpreadsheet,
  HandCoins,
  Receipt,
  Scale,
} from "lucide-react";
import { KpiCard } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { EmptyState } from "@/components/ar/ui/primitives";

const PLANNED = [
  { icon: Receipt, label: "Bills & vendor invoices" },
  { icon: BadgeCheck, label: "Approval workflow" },
  { icon: HandCoins, label: "Payment runs" },
  { icon: Scale, label: "Vendor credits" },
  { icon: FileSpreadsheet, label: "1099 tracking" },
] as const;

export default function ArPayablePage() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 opacity-60 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total payable"
          value="—"
          icon={Banknote}
          accent="purple"
          changePct={null}
        />
        <KpiCard
          label="Due this week"
          value="—"
          icon={CalendarClock}
          accent="orange"
          changePct={null}
        />
        <KpiCard
          label="Overdue bills"
          value="—"
          icon={CircleDollarSign}
          accent="red"
          changePct={null}
          upIsGood={false}
        />
        <KpiCard
          label="Paid this month"
          value="—"
          icon={HandCoins}
          accent="green"
          changePct={null}
        />
      </div>

      <Panel padded={false}>
        <PanelHeader
          title="Accounts Payable"
          description="Vendor bills and outbound payment runs will live here"
        />
        <PanelBody>
          <EmptyState
            icon={Banknote}
            title="Accounts Payable isn't connected yet"
            description="Bills, vendor credits, and payment runs will appear here once the payables service is enabled. Nothing is stubbed — this view stays empty until the backend is live."
          />
        </PanelBody>
      </Panel>

      <Panel padded={false}>
        <PanelHeader
          title="Planned capabilities"
          description="What this module will cover when payables ships"
        />
        <PanelBody>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLANNED.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200/80">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>
    </div>
  );
}
