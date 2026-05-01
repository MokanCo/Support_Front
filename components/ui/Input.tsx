import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({
  label,
  id,
  error,
  className = "",
  placeholder: _omitPlaceholder,
  ...props
}: Props) {
  const inputId = id ?? props.name ?? "input";
  const err = Boolean(error);
  return (
    <div className="w-full">
      <div className="relative pb-1">
        <input
          {...props}
          id={inputId}
          placeholder=" "
          aria-invalid={err || undefined}
          aria-describedby={err ? `${inputId}-error` : undefined}
          className={`peer block w-full rounded-none border-x-0 border-t-0 border-b bg-transparent pb-2 pt-6 text-sm text-slate-900 caret-primary-700 placeholder-transparent outline-none transition-colors duration-150 focus:ring-0 ${err ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-primary-600"} ${className}`}
        />
        <label
          htmlFor={inputId}
          className={`pointer-events-none absolute left-0 top-[1.375rem] origin-[0] text-sm font-medium transition-[top,font-size,color] duration-200 ease-out motion-reduce:transition-none peer-focus:top-1 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-1 peer-[&:not(:placeholder-shown)]:text-xs ${err ? "text-red-600 peer-focus:text-red-700 peer-[&:not(:placeholder-shown)]:text-red-700" : "text-slate-600 peer-focus:text-primary-700 peer-[&:not(:placeholder-shown)]:text-slate-800"}`}
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
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
