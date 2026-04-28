"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";
import type { BoardTaskRow, TaskCommentRow } from "@/components/boards/board-types";
import { PriorityBadge } from "@/components/ui/badge";
import type { TicketPriority } from "@/lib/ticket-types";

export function TaskDetailModal({
  taskId,
  open,
  onClose,
  onChanged,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [task, setTask] = useState<BoardTaskRow | null>(null);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes] = await Promise.all([
        apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`),
        apiFetch(`/api/tasks/comments?taskId=${encodeURIComponent(taskId)}`),
      ]);
      const tJson = await tRes.json();
      const cJson = await cRes.json();
      if (!tRes.ok) throw new Error(tJson.error ?? "Failed to load task");
      if (!cRes.ok) throw new Error(cJson.error ?? "Failed to load comments");
      setTask(tJson.task as BoardTaskRow);
      setComments((cJson.comments as TaskCommentRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) void load();
  }, [open, taskId, load]);

  async function submitComment() {
    if (!taskId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/tasks/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, comment: text.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setText("");
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  const overdue =
    task?.deadline &&
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    new Date(task.deadline).getTime() < Date.now();

  return (
    <Modal open={open} onClose={onClose} title={task?.title ?? "Task"} size="lg">
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : task ? (
        <div className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {task.description || "No description."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority as TicketPriority} />
            {task.deadline ? (
              <span className={`text-xs font-medium ${overdue ? "text-red-600" : "text-slate-600"}`}>
                Due {new Date(task.deadline).toLocaleString()}
              </span>
            ) : null}
          </div>
          {task.ticketId ? (
            <p className="text-sm">
              <span className="text-slate-500">Linked ticket: </span>
              <Link
                href={`/dashboard/tickets/view?id=${encodeURIComponent(task.ticketId)}`}
                className="font-mono text-primary-600 underline"
              >
                {task.ticketCode ?? task.ticketId}
              </Link>
            </p>
          ) : null}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Comments
            </h4>
            <ul className="mt-2 max-h-52 space-y-3 overflow-y-auto">
              {comments.length === 0 ? (
                <li className="text-sm text-slate-500">No comments yet.</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="text-xs font-medium text-slate-800">
                      {c.user.name}{" "}
                      <span className="font-normal text-slate-500">
                        · {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{c.comment}</p>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a comment…"
                rows={2}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <Button type="button" disabled={sending || !text.trim()} onClick={() => void submitComment()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No task selected.</p>
      )}
    </Modal>
  );
}
