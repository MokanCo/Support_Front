"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MessageSquare, MoreHorizontal, Check } from "lucide-react";
import { PriorityBadge } from "@/components/ui/badge";
import type { BoardColumnRow, BoardTaskRow } from "@/components/boards/board-types";
import type { TicketPriority } from "@/lib/ticket-types";
import { apiFetch } from "@/lib/auth-fetch";
import {
  boardTaskCardAccent,
  clampProgress,
  normalizeCardColorId,
} from "@/lib/board-task-card-colors";

function formatDueShort(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  } catch {
    return null;
  }
}

function DraggableTaskCard({
  task,
  onOpen,
}: {
  task: BoardTaskRow;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
  };
  const overdue =
    task.deadline &&
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    new Date(task.deadline).getTime() < Date.now();

  const completed = task.status === "completed";
  const colorId = normalizeCardColorId(task.cardColor);
  const accent = boardTaskCardAccent[colorId];
  const progress = clampProgress(task.progress ?? 0);
  const comments = task.commentCount ?? 0;

  const initials = (task.assignedTo?.name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const desc = task.description?.trim();
  const dueLabel = formatDueShort(task.deadline);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${accent.borderL} ${
        isDragging ? "z-50 opacity-75 ring-2 ring-primary-400" : ""
      }`}
    >
      <div className="flex gap-2.5 p-3">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
          aria-label="Drag to move"
          {...listeners}
          {...attributes}
        >
          <span className="text-[10px] leading-none text-slate-400">⠿</span>
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  completed
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
                aria-hidden
              >
                {completed ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
              </div>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(task.id)}
              >
                <p className="text-[13px] font-semibold leading-snug text-slate-900">{task.title}</p>
              </button>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Task options"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(task.id);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            className="block w-full text-left"
            onClick={() => onOpen(task.id)}
          >
            <p className="line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-slate-500">
              {desc || "Add a short description…"}
            </p>
          </button>

          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority as TicketPriority} />
            {task.ticketCode ? (
              <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-inset ring-violet-200/80">
                {task.ticketCode}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            <div className="flex shrink-0 items-center gap-2">
              {task.assignedTo ? (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 ring-2 ring-white"
                  title={task.assignedTo.email}
                >
                  {initials}
                </span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-200 text-[9px] text-slate-400">
                  —
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {comments} {comments === 1 ? "comment" : "comments"}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${accent.progressFill}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-600">
                  {progress}%
                </span>
              </div>
              <div className="flex justify-end">
                {dueLabel ? (
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      overdue ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {dueLabel}
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    No due date
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnShell({
  column,
  children,
}: {
  column: BoardColumnRow;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.id}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[min(70vh,560px)] w-[min(100vw-2rem,360px)] shrink-0 flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-50/95 to-white shadow-lg shadow-slate-200/50 ${
        isOver ? "border-primary-400 ring-2 ring-primary-200/80" : "border-slate-200/90"
      }`}
    >
      {children}
    </div>
  );
}

export function KanbanBoard({
  columns,
  tasks,
  onMoved,
  onOpenTask,
  onAddTask,
  canAddTask,
}: {
  columns: BoardColumnRow[];
  tasks: BoardTaskRow[];
  onMoved: () => void;
  onOpenTask: (taskId: string) => void;
  onAddTask?: (columnId: string) => void;
  canAddTask?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  const tasksByColumn = useMemo(() => {
    const m: Record<string, BoardTaskRow[]> = {};
    for (const c of columns) m[c.id] = [];
    for (const t of tasks) {
      if (!m[t.columnId]) m[t.columnId] = [];
      m[t.columnId].push(t);
    }
    for (const id of Object.keys(m)) {
      m[id].sort((a, b) => a.order - b.order);
    }
    return m;
  }, [columns, tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const taskId = String(active.id);
      const moving = tasks.find((t) => t.id === taskId);
      if (!moving) return;

      let destColumnId: string;
      let newOrder = 0;
      const overId = String(over.id);
      if (overId.startsWith("col:")) {
        destColumnId = overId.slice(4);
        const inCol = tasks
          .filter((t) => t.columnId === destColumnId && t.id !== taskId)
          .sort((a, b) => a.order - b.order);
        newOrder = inCol.length;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (!overTask) return;
        destColumnId = overTask.columnId;
        const inCol = tasks
          .filter((t) => t.columnId === destColumnId && t.id !== taskId)
          .sort((a, b) => a.order - b.order);
        const idx = inCol.findIndex((x) => x.id === overTask.id);
        newOrder = Math.max(0, idx);
      }

      setSaving(true);
      try {
        const res = await apiFetch("/api/tasks/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, destinationColumnId: destColumnId, newOrder }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Move failed");
        }
        onMoved();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setSaving(false);
      }
    },
    [tasks, onMoved]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="-mx-1 w-full min-w-0 px-1">
        <div className="flex gap-8 overflow-x-auto pb-3 pt-1">
          {sortedColumns.map((col) => {
            const colTasks = tasksByColumn[col.id] ?? [];
            return (
              <ColumnShell key={col.id} column={col}>
                <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/95 px-4 py-3 shadow-md shadow-slate-200/40 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold tracking-tight text-slate-900">{col.name}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-800 shadow-sm">
                        {colTasks.length}
                      </span>
                      {canAddTask && onAddTask ? (
                        <button
                          type="button"
                          title="Add task"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                          onClick={() => onAddTask(col.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto p-3">
                  {colTasks.map((task) => (
                    <DraggableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
                  ))}
                </div>
              </ColumnShell>
            );
          })}
        </div>
      </div>
      {saving ? (
        <p className="mt-2 text-center text-xs text-slate-500">Saving order…</p>
      ) : null}
    </DndContext>
  );
}
