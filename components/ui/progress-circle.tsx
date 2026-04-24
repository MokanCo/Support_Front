"use client";

function strokeColor(p: number): string {
  if (p >= 100) return "#10b981";
  if (p >= 71) return "#3b82f6";
  if (p >= 31) return "#eab308";
  return "#ef4444";
}

export function ProgressCircle({
  value,
  onClick,
  disabled,
  size = 44,
}: {
  value: number;
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = c * (1 - clamped / 100);
  const color = strokeColor(clamped);
  const locked = disabled || clamped >= 100;

  return (
    <button
      type="button"
      disabled={locked}
      onClick={locked ? undefined : onClick}
      className={`relative inline-flex items-center justify-center rounded-full transition-transform ${
        locked
          ? "cursor-default opacity-90"
          : "cursor-pointer hover:scale-105 active:scale-95"
      }`}
      title={locked ? "Complete" : "Update progress"}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-slate-800">
        {Math.round(clamped)}%
      </span>
    </button>
  );
}
