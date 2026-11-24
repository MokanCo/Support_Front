"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AI_RECEPTIONIST_NAV, isAiReceptionistNavActive } from "@/components/ai-receptionist/nav";

type Tip = { label: string; x: number; y: number };

export function AiReceptionistSubnav() {
  const pathname = usePathname();
  const [tip, setTip] = useState<Tip | null>(null);

  function showTip(label: string, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setTip({
      label,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  return (
    <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <nav aria-label="AI Receptionist" className="overflow-x-auto px-4 py-3 lg:px-8">
        <ul className="flex w-max min-w-full flex-nowrap items-center gap-2">
          {AI_RECEPTIONIST_NAV.map((item) => {
            const active = isAiReceptionistNavActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={(event) => showTip(item.label, event.currentTarget)}
                  onFocus={(event) => showTip(item.label, event.currentTarget)}
                  onMouseLeave={() => setTip(null)}
                  onBlur={() => setTip(null)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                    active
                      ? "border-primary-700 bg-primary-700 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {tip && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              style={{ left: tip.x, top: tip.y - 8 }}
              className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg"
            >
              {tip.label}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}
