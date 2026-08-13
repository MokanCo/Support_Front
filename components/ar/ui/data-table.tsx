"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Inbox,
  Search,
} from "lucide-react";
import { EmptyState, SkeletonRows } from "@/components/ar/ui/primitives";

export type Column<T> = {
  id: string;
  header: string;
  /** Raw value used for sorting, searching, and CSV export. */
  accessor: (row: T) => string | number | null | undefined;
  /** Rich cell renderer; falls back to the accessor value. */
  cell?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Tailwind width utility, e.g. "w-40". */
  width?: string;
  sortable?: boolean;
  /** Hidden until enabled in the column chooser. */
  defaultHidden?: boolean;
  /** Excluded from the column chooser (e.g. an actions column). */
  locked?: boolean;
};

type SortState = { id: string; dir: "asc" | "desc" } | null;

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  searchable = true,
  searchPlaceholder = "Search…",
  toolbar,
  initialSort,
  pageSize: initialPageSize = 10,
  exportFileName,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  onRowClick,
  dense = false,
  stickyOffset = 0,
  maxHeight = "60vh",
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Extra filter controls rendered inline in the toolbar. */
  toolbar?: ReactNode;
  initialSort?: SortState;
  pageSize?: number;
  /** Enables the CSV export button when provided. */
  exportFileName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  dense?: boolean;
  /** Top offset for the sticky header when nested under other sticky bars. */
  stickyOffset?: number;
  /**
   * Height cap for the scrollable body. The wrapper has to be its own
   * scrollport, otherwise the sticky header has nothing to stick against.
   */
  maxHeight?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const [chooserOpen, setChooserOpen] = useState(false);
  const chooserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chooserOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!chooserRef.current?.contains(e.target as Node)) setChooserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [chooserOpen]);

  useEffect(() => {
    setPage(1);
  }, [query, rows.length, pageSize]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hidden.has(c.id)),
    [columns, hidden],
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => String(c.accessor(row) ?? "").toLowerCase().includes(q)),
    );
  }, [rows, columns, query]);

  const sorted = useMemo(() => {
    if (!sort) return searched;
    const col = columns.find((c) => c.id === sort.id);
    if (!col) return searched;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...searched].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [searched, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(col: Column<T>) {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.id !== col.id) return { id: col.id, dir: "asc" };
      if (prev.dir === "asc") return { id: col.id, dir: "desc" };
      return null;
    });
  }

  function handleExport() {
    if (!exportFileName) return;
    const cols = visibleColumns;
    downloadCsv(
      exportFileName.endsWith(".csv") ? exportFileName : `${exportFileName}.csv`,
      cols.map((c) => csvEscape(c.header)),
      sorted.map((row) => cols.map((c) => csvEscape(c.accessor(row)))),
    );
  }

  const alignClass = (align?: Column<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const cellPad = dense ? "px-4 py-2.5" : "px-5 py-3.5";

  return (
    <div className="flex flex-col">
      {/* toolbar */}
      {searchable || toolbar || exportFileName ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {searchable ? (
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
            ) : null}
            {toolbar}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={chooserRef}>
              <button
                type="button"
                onClick={() => setChooserOpen((o) => !o)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <Columns3 className="h-4 w-4" />
                Columns
              </button>
              {chooserOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-52 origin-top-right animate-[fadeIn_120ms_ease-out] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {columns
                    .filter((c) => !c.locked)
                    .map((c) => {
                      const shown = !hidden.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={shown}
                            onChange={() =>
                              setHidden((prev) => {
                                const next = new Set(prev);
                                if (shown) next.add(c.id);
                                else next.delete(c.id);
                                return next;
                              })
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          {c.header}
                        </label>
                      );
                    })}
                </div>
              ) : null}
            </div>

            {exportFileName ? (
              <button
                type="button"
                onClick={handleExport}
                disabled={sorted.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* table */}
      {loading ? (
        <SkeletonRows rows={6} cols={Math.min(5, visibleColumns.length || 4)} />
      ) : pageRows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={query ? "No matching results" : emptyTitle}
          description={
            query
              ? "Try a different search term or clear your filters."
              : emptyDescription
          }
          action={query ? undefined : emptyAction}
        />
      ) : (
        <div className="ar-scroll overflow-auto" style={{ maxHeight }}>
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {visibleColumns.map((col) => {
                  const active = sort?.id === col.id;
                  const sortable = col.sortable !== false;
                  return (
                    <th
                      key={col.id}
                      scope="col"
                      style={{ top: stickyOffset }}
                      className={`sticky z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50/95 backdrop-blur ${cellPad} text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${alignClass(
                        col.align,
                      )} ${col.width ?? ""}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${
                            col.align === "right" ? "flex-row-reverse" : ""
                          } ${active ? "text-slate-900" : ""}`}
                        >
                          {col.header}
                          {active ? (
                            sort?.dir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : null}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`group transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  } hover:bg-slate-50/80`}
                >
                  {visibleColumns.map((col, ci) => (
                    <td
                      key={col.id}
                      className={`border-b border-slate-100 ${cellPad} align-middle text-slate-700 ${alignClass(
                        col.align,
                      )} ${ci === 0 ? "rounded-l-lg" : ""} ${
                        ci === visibleColumns.length - 1 ? "rounded-r-lg" : ""
                      }`}
                    >
                      {col.cell ? col.cell(row) : (col.accessor(row) ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      {!loading && sorted.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, sorted.length)}
            </span>{" "}
            of <span className="font-medium text-slate-700">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition focus:border-slate-300"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs tabular-nums text-slate-600">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
