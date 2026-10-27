"use client";

import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { compactMoney, count, money, ratio } from "@/lib/ar/format";
import { CHART_SERIES } from "@/lib/ar/theme";
import { EmptyState } from "@/components/ar/ui/primitives";

const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };
const GRID_STROKE = "#f1f5f9";
const ANIM = 700;

export type Series = {
  key: string;
  label: string;
  color: string;
};

function TooltipCard({
  label,
  rows,
}: {
  label?: ReactNode;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      {label ? (
        <p className="mb-1.5 text-xs font-semibold text-slate-900">{label}</p>
      ) : null}
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            {row.color ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span className="text-slate-500">{row.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type TooltipEntry = {
  name?: unknown;
  dataKey?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
};

function moneyTooltip(formatter: (n: number) => string) {
  return function Rendered(props: unknown) {
    const { active, label, payload } = (props ?? {}) as {
      active?: boolean;
      label?: ReactNode;
      payload?: TooltipEntry[];
    };
    if (!active || !payload?.length) return null;
    return (
      <TooltipCard
        label={label}
        rows={payload.map((p) => ({
          label: String(p.name ?? p.dataKey ?? ""),
          value: formatter(Number(p.value) || 0),
          color: p.color || p.fill,
        }))}
      />
    );
  } as unknown as React.ComponentProps<typeof Tooltip>["content"];
}

function ChartEmpty({ message }: { message: string }) {
  return <EmptyState compact title="No data in this range" description={message} />;
}

/* ------------------------------------------------------------ area charts */

/**
 * Gradient area chart. Pass two or more series to get a stacked area.
 */
export function AreaTrendChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
  stacked = false,
  valueFormatter = (n: number) => money(n),
  emptyMessage = "Adjust the filters to see activity here.",
}: {
  data: T[];
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
  valueFormatter?: (n: number) => string;
  emptyMessage?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const hasData = data.some((d) =>
    series.some((s) => Number(d[s.key as keyof T]) > 0),
  );
  if (!hasData) return <ChartEmpty message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`${gradientId}-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => compactMoney(v)}
        />
        <Tooltip
          content={moneyTooltip(valueFormatter)}
          cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
        />
        {series.length > 1 ? (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 8 }}
          />
        ) : null}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#${gradientId}-${s.key})`}
            animationDuration={ANIM}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------- bar charts */

export function BarTrendChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
  stacked = false,
  valueFormatter = (n: number) => money(n),
  emptyMessage = "Adjust the filters to see activity here.",
}: {
  data: T[];
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
  valueFormatter?: (n: number) => string;
  emptyMessage?: string;
}) {
  const hasData = data.some((d) =>
    series.some((s) => Number(d[s.key as keyof T]) > 0),
  );
  if (!hasData) return <ChartEmpty message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} dy={8} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => compactMoney(v)}
        />
        <Tooltip
          content={moneyTooltip(valueFormatter)}
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
        />
        {series.length > 1 ? (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 8 }}
          />
        ) : null}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            fill={s.color}
            radius={stacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            maxBarSize={38}
            animationDuration={ANIM}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Ranked horizontal bars — used for top customers / revenue by partner. */
export function HorizontalBarChart({
  data,
  height = 280,
  color = CHART_SERIES[0],
  valueFormatter = (n: number) => money(n),
  emptyMessage = "No ranked results for this range.",
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  valueFormatter?: (n: number) => string;
  emptyMessage?: string;
}) {
  if (!data.some((d) => d.value > 0)) return <ChartEmpty message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => compactMoney(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={128}
        />
        <Tooltip
          content={moneyTooltip(valueFormatter)}
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
        />
        <Bar
          dataKey="value"
          name="Amount"
          fill={color}
          radius={[0, 6, 6, 0]}
          maxBarSize={22}
          animationDuration={ANIM}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={CHART_SERIES[i % CHART_SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------- circular */

export function DonutChart({
  data,
  height = 260,
  centerLabel,
  centerValue,
  valueFormatter = (n: number) => count(n),
  emptyMessage = "Nothing to break down yet.",
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (n: number) => string;
  emptyMessage?: string;
}) {
  if (!data.some((d) => d.value > 0)) return <ChartEmpty message={emptyMessage} />;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip content={moneyTooltip(valueFormatter)} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
            animationDuration={ANIM}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? CHART_SERIES[i % CHART_SERIES.length]}
              />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#64748b" }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
          <p className="text-xl font-semibold tabular-nums text-slate-900">
            {centerValue}
          </p>
          {centerLabel ? (
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              {centerLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Radial gauge for a single completion ratio, e.g. collection progress. */
export function RadialProgressChart({
  value,
  label,
  color = CHART_SERIES[1],
  height = 220,
}: {
  /** 0–100 */
  value: number;
  label: string;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ name: label, value: clamped, fill: color }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "#f1f5f9" }}
            dataKey="value"
            cornerRadius={999}
            animationDuration={ANIM}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {ratio(clamped, 0)}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- treemap */

type TreemapNode = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
};

function TreemapCell(props: TreemapNode) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name, value } = props;
  const fill = CHART_SERIES[index % CHART_SERIES.length];
  const showLabel = width > 74 && height > 40;
  return (
    <g>
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        rx={10}
        fill={fill}
        fillOpacity={0.88}
      />
      {showLabel ? (
        <>
          <text
            x={x + 12}
            y={y + 22}
            fill="#ffffff"
            fontSize={11}
            fontWeight={600}
            className="pointer-events-none"
          >
            {String(name ?? "").slice(0, Math.floor(width / 7))}
          </text>
          <text
            x={x + 12}
            y={y + 38}
            fill="#ffffff"
            fontSize={11}
            fillOpacity={0.85}
            className="pointer-events-none"
          >
            {compactMoney(value)}
          </text>
        </>
      ) : null}
    </g>
  );
}

export function RevenueTreemap({
  data,
  height = 280,
  emptyMessage = "No revenue recorded in this range.",
}: {
  data: { name: string; value: number }[];
  height?: number;
  emptyMessage?: string;
}) {
  const positive = data.filter((d) => d.value > 0);
  if (!positive.length) return <ChartEmpty message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={positive}
        dataKey="value"
        nameKey="name"
        stroke="none"
        content={<TreemapCell />}
        animationDuration={ANIM}
      >
        <Tooltip content={moneyTooltip((n) => money(n))} />
      </Treemap>
    </ResponsiveContainer>
  );
}

/* ---------------------------------------------------------------- heatmap */

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** GitHub-style intensity grid for collection activity. */
export function CollectionsHeatmap({
  cells,
  weeks,
  emptyMessage = "No payments recorded in this window.",
}: {
  cells: { week: number; day: number; label: string; total: number }[];
  weeks: number;
  emptyMessage?: string;
}) {
  const max = Math.max(...cells.map((c) => c.total), 0);
  if (max <= 0) return <ChartEmpty message={emptyMessage} />;

  const intensity = (total: number) => {
    if (total <= 0) return "bg-slate-100";
    const pct = total / max;
    if (pct > 0.75) return "bg-emerald-600";
    if (pct > 0.5) return "bg-emerald-500";
    if (pct > 0.25) return "bg-emerald-400";
    return "bg-emerald-200";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col gap-1 pr-1">
          {DAY_LABELS.map((d, i) => (
            <span
              key={i}
              className="flex h-[14px] items-center text-[9px] font-medium text-slate-400"
            >
              {i % 2 === 1 ? d : ""}
            </span>
          ))}
        </div>
        {Array.from({ length: weeks }).map((_, week) => (
          <div key={week} className="flex shrink-0 flex-col gap-1">
            {Array.from({ length: 7 }).map((__, day) => {
              const cell = cells.find((c) => c.week === week && c.day === day);
              return (
                <span
                  key={day}
                  title={
                    cell
                      ? `${cell.label} — ${money(cell.total)}`
                      : "No activity"
                  }
                  className={`h-[14px] w-[14px] rounded-[4px] transition-transform duration-150 hover:scale-125 ${intensity(
                    cell?.total ?? 0,
                  )}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
        <span>Less</span>
        {["bg-slate-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-500", "bg-emerald-600"].map(
          (c) => (
            <span key={c} className={`h-[10px] w-[10px] rounded-[3px] ${c}`} />
          ),
        )}
        <span>More</span>
      </div>
    </div>
  );
}
