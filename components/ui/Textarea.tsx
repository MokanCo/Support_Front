import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  /** When true, label is only for screen readers (compact toolbars). */
  hideLabel?: boolean;
};

export function Textarea({
  label,
  id,
  error,
  hideLabel,
  rows = 4,
  className = "",
  placeholder: _omitPlaceholder,
  ...props
}: Props) {
  const tid = id ?? props.name ?? "textarea";
  const err = Boolean(error);

  if (hideLabel) {
    return (
      <label className="block w-full">
        <span className="sr-only">{label}</span>
        <textarea
          id={tid}
          rows={rows}
          aria-invalid={err || undefined}
          className={`block w-full rounded-none border-x-0 border-t-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none focus:ring-0 ${err ? "border-red-400 focus:border-red-500" : ""} ${className}`}
          {...props}
        />
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </label>
    );
  }

  return (
    <div className="w-full">
      <div className="relative pb-1">
        <textarea
          {...props}
          id={tid}
          rows={rows}
          placeholder=" "
          aria-invalid={err || undefined}
          aria-describedby={err ? `${tid}-error` : undefined}
          className={`peer min-h-[6.5rem] w-full resize-y rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 pb-3 pt-9 text-sm text-slate-900 caret-primary-700 placeholder-transparent outline-none transition-colors duration-150 focus:ring-0 ${err ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-primary-600"} ${className}`}
        />
        <label
          htmlFor={tid}
          className={`pointer-events-none absolute left-0 top-[1.6rem] origin-[0] text-sm font-medium transition-[top,font-size,color] duration-200 ease-out motion-reduce:transition-none peer-focus:top-2 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs ${err ? "text-red-600 peer-focus:text-red-700 peer-[&:not(:placeholder-shown)]:text-red-700" : "text-slate-600 peer-focus:text-primary-700 peer-[&:not(:placeholder-shown)]:text-slate-800"}`}
        >
          {label}
          {props.required ? (
            <span aria-hidden className="text-red-500">
              {" "}
              *
            </span>
          ) : null}
        </label>
      </div>
      {error ? (
        <p id={`${tid}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
