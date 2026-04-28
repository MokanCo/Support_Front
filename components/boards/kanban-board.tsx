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
import { PriorityBadge } from "@/components/ui/badge";
import type { BoardColumnRow, BoardTaskRow } from "@/components/boards/board-types";
import type { TicketPriority } from "@/lib/ticket-types";
import { apiFetch } from "@/lib/auth-fetch";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${
        isDragging ? "z-50 opacity-60 ring-2 ring-primary-400" : ""
      }`}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded px-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
          aria-label="Drag to move"
          {...listeners}
          {...attributes}
        >
          <span className="text-xs leading-none">⠿</span>
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(task.id)}
        >
      <p className="text-sm font-medium text-slate-900">{task.title}</p>
      {task.ticketCode ? (
        <p className="mt-1 font-mono text-[10px] font-semibold text-primary-600">{task.ticketCode}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority as TicketPriority} />
        {task.deadline ? (
          <span
            className={`text-[10px] font-medium ${
              overdue ? "text-red-600" : "text-slate-500"
            }`}
          >
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        ) : null}
      </div>
      {task.assignedTo ? (
        <div
          className="mt-2 flex items-center gap-2"
          title={task.assignedTo.email}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
            {(task.assignedTo.name || "?")
              .split(/\s+/)
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="truncate text-xs text-slate-600">{task.assignedTo.name}</span>
        </div>
      ) : null}
        </button>
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
      className={`flex w-[min(100vw-2rem,280px)] shrink-0 flex-col rounded-2xl border bg-slate-50/90 ${
        isOver ? "border-primary-400 ring-2 ring-primary-200" : "border-slate-200"
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
}: {
  columns: BoardColumnRow[];
  tasks: BoardTaskRow[];
  onMoved: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns]
  );

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
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
        {sortedColumns.map((col) => {
          const colTasks = tasksByColumn[col.id] ?? [];
          return (
            <ColumnShell key={col.id} column={col}>
              <div className="shrink-0 border-b border-slate-200/80 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">{col.name}</h3>
                <p className="text-[11px] text-slate-500">{colTasks.length} tasks</p>
              </div>
              <div className="flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto p-2">
                {colTasks.map((task) => (
                  <DraggableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
                ))}
              </div>
            </ColumnShell>
          );
        })}
      </div>
      {saving ? (
        <p className="mt-2 text-center text-xs text-slate-500">Saving order…</p>
      ) : null}
    </DndContext>
  );
}
