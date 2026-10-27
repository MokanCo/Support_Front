"use client";

import {
  BookUser,
  Building2,
  Contact,
  FileBadge,
  Landmark,
  Timer,
} from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { EmptyState } from "@/components/ar/ui/primitives";

const PLANNED = [
  { icon: BookUser, label: "Vendor directory" },
  { icon: Timer, label: "Payment terms" },
  { icon: Landmark, label: "Default expense accounts" },
  { icon: FileBadge, label: "W-9 / tax details" },
  { icon: Contact, label: "Contact management" },
] as const;

export default function ArVendorsPage() {
  return (
    <div className="space-y-5">
      <Panel padded={false}>
        <PanelHeader
          title="Vendors"
          description="Supplier records arrive with the payables module"
        />
        <PanelBody>
          <EmptyState
            icon={Building2}
            title="No vendors yet"
            description="Vendor records arrive with the payables module. Once enabled, directories, tax details, and payment terms will be managed here."
          />
        </PanelBody>
      </Panel>

      <Panel padded={false}>
        <PanelHeader
          title="Planned capabilities"
          description="What vendor management will cover when payables ships"
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
