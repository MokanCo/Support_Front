"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

type DirectoryCard = {
  title: string;
  description: string;
  associate: string;
};

const DIRECTORY: DirectoryCard[] = [
  {
    title: "NEW DEVELOPMENT",
    description: "New locations, site selection, construction, permits, openings.",
    associate: "Numan",
  },
  {
    title: "OPERATIONS",
    description: "Day-to-day operations, SOPs, store support, operational standards.",
    associate: "Ali",
  },
  {
    title: "EQUIPMENT & PROCUREMENT",
    description: "Equipment purchasing, approved vendors, warranties, replacements.",
    associate: "Mohamed",
  },
  {
    title: "SUPPLY CHAIN & PURCHASING",
    description: "Coffee, ingredients, packaging, cleaning and store supplies.",
    associate: "Mohamed",
  },
  {
    title: "WAREHOUSE & DISTRIBUTION",
    description: "Orders, shipments, missing/damaged items, delivery, inventory.",
    associate: "Yahya",
  },
  {
    title: "BRAND & MARKETING",
    description: "Brand touchpoints, rendering, interior design, marketing, social media.",
    associate: "Don",
  },
  {
    title: "TECHNOLOGY / IT",
    description: "Website, cyber security, POS, support portal, tech support.",
    associate: "Nawab",
  },
  {
    title: "TRAINING",
    description: "Barista/manager training, onboarding, SOP training.",
    associate: "Ali",
  },
  {
    title: "FINANCE & ACCOUNTING",
    description: "Royalties, invoices, payments, billing, financial questions.",
    associate: "Penelope",
  },
  {
    title: "PARTNER SUPPORT",
    description: "Partner relationship, corporate support, escalations, general concerns.",
    associate: "Numan",
  },
  {
    title: "QUALITY & FOOD SAFETY",
    description: "Product quality, recipes, food safety, recalls, allergens.",
    associate: "Ammary",
  },
  {
    title: "LEGAL & COMPLIANCE",
    description: "Franchise agreements, legal notices, trademarks, regulatory matters.",
    associate: "Numan",
  },
  {
    title: "RETAIL & WHOLESALE",
    description: "Retail coffee, merchandise, packaged products, wholesale.",
    associate: "Nasser",
  },
  {
    title: "CORPORATE COMMUNICATIONS",
    description: "Corporate announcements, newsletters, policy updates.",
    associate: "Penelope",
  },
  {
    title: "PARTNER RESOURCES & SUPPORT PORTAL",
    description: "Partner portal access, resource library, forms, SOPs, training materials.",
    associate: "Nawab",
  },
  {
    title: "DIGITAL ADS",
    description: "SEO, Google ads, Meta ads (Instagram & Facebook).",
    associate: "Saad",
  },
];

export function HelpDirectoryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIRECTORY;
    return DIRECTORY.filter(
      (card) =>
        card.title.toLowerCase().includes(q) ||
        card.associate.toLowerCase().includes(q),
    );
  }, [query]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex min-h-[100dvh] items-center justify-center overflow-y-auto p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="fixed inset-0 min-h-[100dvh] w-screen bg-slate-900/55 backdrop-blur-sm"
        aria-label="Close help directory"
        onClick={onClose}
      />
      <div
        className="relative z-[1] my-auto flex max-h-[90vh] w-[80%] flex-col overflow-hidden"
        style={{ borderRadius: "5px" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-directory-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <h2
            id="help-directory-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Support Directory
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"
          style={{ backgroundColor: "#E9E8E4" }}
        >
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="help-directory-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names and titles"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none ring-primary-200 focus:border-primary-300 focus:ring-4"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="mt-5 py-16 text-center text-sm text-neutral-600">
              No matching departments or associates.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((card) => (
                <article
                  key={card.title}
                  className="flex min-h-[168px] flex-col px-4 py-4"
                  style={{ backgroundColor: "#F7F6F2" }}
                >
                  <h3
                    className="w-fit text-[11px] font-semibold uppercase tracking-[0.08em]"
                    style={{
                      color: "#A68966",
                      borderBottom: "1px solid #A68966",
                      paddingBottom: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {card.title}
                  </h3>
                  <p className="mt-3 flex-1 text-[12px] leading-snug text-neutral-700">
                    {card.description}
                  </p>
                  <div className="mt-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                      Associate
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold text-neutral-900">{card.associate}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 bg-white px-5 py-3 sm:px-7">
          <p className="text-center text-[11px] italic text-neutral-600">
            Note: this directory routes requests through your liaison above. Direct contact
            information for corporate staff is not published externally.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
