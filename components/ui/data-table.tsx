"use client";

import { SkeletonTableRows } from "@/components/ui/skeleton";

export function DataTableToolbar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      {children}
    </div>
  );
}

export function DataTableBulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary-200 bg-primary-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-primary-900">
        {count} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-primary-700 underline-offset-4 hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export type DataColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortKey?: string;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  rowId: (row: T) => string;
  selectable?: boolean;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAllPage: () => void;
  allSelectedOnPage: boolean;
  loading?: boolean;
  emptyMessage?: string;
  /** When true, table fills a flex parent and scrolls inside it instead of using a fixed max-height. */
  fillHeight?: boolean;
  /** Navigate or act when the row is clicked; clicks on links, buttons, inputs, etc. are ignored. */
  onRowClick?: (row: T) => void;
  /** When false, row cannot be bulk-selected (checkbox hidden). */
  isRowSelectable?: (row: T) => boolean;
  /** Replaces the checkbox (e.g. primary badge). Implies not selectable. */
  renderRowSelect?: (row: T) => React.ReactNode | null;
};

function isRowClickFromInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("a,button,input,select,textarea,label,[data-no-row-nav],[role='menu']"),
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowId,
  selectable,
  selectedIds,
  onToggleRow,
  onToggleAllPage,
  allSelectedOnPage,
  loading,
  emptyMessage = "No rows to display.",
  fillHeight = false,
  onRowClick,
  isRowSelectable,
  renderRowSelect,
}: DataTableProps<T>) {
  const selectableRows = isRowSelectable
    ? rows.filter((row) => isRowSelectable(row))
    : rows;
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        fillHeight ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <div
        className={
          fillHeight
            ? "min-h-0 flex-1 overflow-auto"
            : "max-h-[min(70vh,880px)] overflow-auto"
        }
      >
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectable ? (
                <th className="w-10 px-4 py-3">
                  {selectableRows.length > 0 ? (
                    <input
                      type="checkbox"
                      checked={
                        selectableRows.length > 0 &&
                        selectableRows.every((row) => selectedIds.has(rowId(row)))
                      }
                      onChange={onToggleAllPage}
                      aria-label="Select all on page"
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  ) : null}
                </th>
              ) : null}
              {columns.map((c) => (
                <th
                  key={c.id}
                  className={`px-4 py-3 ${c.headerClassName ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonTableRows
                rows={8}
                columns={columns.length}
                selectable={selectable}
              />
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = rowId(row);
                return (
                  <tr
                    key={id}
                    className={`transition-colors hover:bg-slate-50/90 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                    onClick={
                      onRowClick
                        ? (e) => {
                            if (isRowClickFromInteractiveTarget(e.target)) return;
                            onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {selectable ? (
                      <td className="px-4 py-3">
                        {renderRowSelect?.(row) ?? (
                          isRowSelectable && !isRowSelectable(row) ? null : (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(id)}
                              onChange={() => onToggleRow(id)}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                          )
                        )}
                      </td>
                    ) : null}
                    {columns.map((c) => (
                      <td key={c.id} className={`px-4 py-3 ${c.className ?? ""}`}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
