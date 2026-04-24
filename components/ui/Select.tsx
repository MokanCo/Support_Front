import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export function Select({ label, id, error, className = "", children, ...props }: Props) {
  const selectId = id ?? props.name;
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <select
        id={selectId}
        className={`block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </label>
  );
}
