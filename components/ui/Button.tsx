import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary:
      "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:outline-primary-600",
    secondary:
      "bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 focus-visible:outline-slate-400",
    ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400",
    danger:
      "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
  };
  return (
    <button
      type="button"
      className={`${base} ${styles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
