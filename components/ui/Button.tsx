import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  const styles = {
    primary:
      "bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white shadow-sm hover:from-primary-800 hover:via-primary-700 hover:to-primary-600 focus-visible:outline-primary-600",
    secondary:
      "bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 focus-visible:outline-slate-400",
    ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
  };
  return (
    <button
      type="button"
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
