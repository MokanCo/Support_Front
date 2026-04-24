"use client";

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
};

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
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[min(70vh,880px)] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectable ? (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={onToggleAllPage}
                    aria-label="Select all on page"
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
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
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  Loading…
                </td>
              </tr>
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
                    className="transition-colors hover:bg-slate-50/90"
                  >
                    {selectable ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(id)}
                          onChange={() => onToggleRow(id)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
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
