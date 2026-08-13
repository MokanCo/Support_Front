import type { ReactNode } from "react";
import { CARD } from "@/lib/ar/theme";

/**
 * The single card surface used by every Accounts screen. Keeping header,
 * padding, and radius in one component is what stops spacing drifting
 * between pages.
 */
export function Panel({
  children,
  className = "",
  padded = true,
  overflowVisible = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** Set when a child needs to render outside the card's bounds, e.g. an
   *  absolutely-positioned dropdown — the default overflow-hidden (needed
   *  for the rounded corners elsewhere) would otherwise clip it. */
  overflowVisible?: boolean;
}) {
  return (
    <section className={`${CARD} ${overflowVisible ? "" : "overflow-hidden"} ${className}`}>
      {padded ? <div className="p-5 sm:p-6">{children}</div> : children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  icon,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PanelBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

/** Page-level heading used at the top of each Accounts route. */
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}
