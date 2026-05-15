"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Trash2, Smile, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/auth-fetch";
import { getAccessToken } from "@/lib/access-token";
import { resolveApiUrl } from "@/lib/api-base";
import { renderTextWithUrls } from "@/lib/render-text-with-urls";
import type {
  BoardMemberRow,
  BoardTaskRow,
  TaskAttachmentRow,
  TaskCommentRow,
} from "@/components/boards/board-types";
import { PriorityBadge } from "@/components/ui/badge";
import type { TicketPriority } from "@/lib/ticket-types";
import {
  BOARD_TASK_CARD_COLOR_IDS,
  boardTaskCardAccent,
  clampProgress,
  normalizeCardColorId,
} from "@/lib/board-task-card-colors";

const EMOJI_PICKS = ["😀", "👍", "❤️", "🎉", "✅", "🔥", "👀", "💡", "🙏", "⏰", "🚀", "✨"];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mentionNameMap(members: BoardMemberRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const u of members) m.set(u.id, u.name || u.email || "User");
  return m;
}

function formatMentionsInText(text: string, names: Map<string, string>): string {
  return text.replace(/<@([a-f0-9]{24})>/gi, (_, id) => {
    const n = names.get(String(id));
    return n != null ? `@${n}` : "@user";
  });
}

function fuzzyFilterMembers(query: string, members: BoardMemberRow[]): BoardMemberRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return members;
  const scored = members
    .map((m) => {
      const hay = `${m.name} ${m.email}`.toLowerCase();
      if (hay.includes(q)) return { m, s: 2 };
      let qi = 0;
      for (let i = 0; i < hay.length && qi < q.length; i++) {
        if (hay[i] === q[qi]) qi++;
      }
      return { m, s: qi === q.length ? 1 : 0 };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}

export function TaskDetailDrawer({
  taskId,
  open,
  onClose,
  onChanged,
  boardMembers,
  canEdit,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  boardMembers: BoardMemberRow[];
  canEdit: boolean;
}) {
  const [task, setTask] = useState<BoardTaskRow | null>(null);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachmentRow[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftPriority, setDraftPriority] = useState<TicketPriority>("medium");
  const [draftDeadline, setDraftDeadline] = useState("");
  const [draftAssignee, setDraftAssignee] = useState("");
  const [draftCardColor, setDraftCardColor] = useState("gray");
  const [draftProgress, setDraftProgress] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionAnchor, setMentionAnchor] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const nameById = useMemo(() => {
    const m = mentionNameMap(boardMembers);
    for (const c of comments) {
      m.set(c.user.id, c.user.name || c.user.email || "User");
    }
    return m;
  }, [boardMembers, comments]);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes, aRes] = await Promise.all([
        apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`),
        apiFetch(`/api/tasks/comments?taskId=${encodeURIComponent(taskId)}`),
        apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/attachments`),
      ]);
      const tJson = await tRes.json();
      const cJson = await cRes.json();
      const aJson = aRes.ok ? await aRes.json() : { attachments: [] };
      if (!tRes.ok) throw new Error(tJson.error ?? "Failed to load task");
      if (!cRes.ok) throw new Error(cJson.error ?? "Failed to load comments");
      const t = tJson.task as BoardTaskRow;
      setTask(t);
      setDraftTitle(t.title);
      setDraftDesc(t.description ?? "");
      setDraftPriority(t.priority as TicketPriority);
      setDraftDeadline(t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : "");
      setDraftAssignee(t.assignedTo?.id ?? "");
      setDraftCardColor(normalizeCardColorId(t.cardColor));
      setDraftProgress(clampProgress(t.progress ?? 0));
      setComments((cJson.comments as TaskCommentRow[]) ?? []);
      setAttachments((aJson.attachments as TaskAttachmentRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) void load();
  }, [open, taskId, load]);

  async function saveTask() {
    if (!taskId || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: draftTitle.trim(),
        description: draftDesc,
        priority: draftPriority,
        deadline: draftDeadline ? new Date(draftDeadline).toISOString() : null,
        assignedTo: draftAssignee || null,
        cardColor: draftCardColor,
        progress: draftProgress,
      };
      const res = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    if (!taskId || !commentText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/tasks/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, comment: commentText.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setCommentText("");
      setMentionOpen(false);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(file: File) {
    if (!taskId || !canEdit) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/attachments`, {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      if (j.attachment) setAttachments((prev) => [j.attachment as TaskAttachmentRow, ...prev]);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function downloadAttachment(att: TaskAttachmentRow) {
    const url = resolveApiUrl(`/api/tasks/attachments/${encodeURIComponent(att.id)}/download`);
    const token = getAccessToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "omit",
    });
    if (!res.ok) {
      setError("Download failed");
      return;
    }
    const blob = await res.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = att.originalName;
    a.click();
    URL.revokeObjectURL(u);
  }

  async function openAttachmentView(att: TaskAttachmentRow) {
    const url = resolveApiUrl(`/api/tasks/attachments/${encodeURIComponent(att.id)}/download`);
    const token = getAccessToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "omit",
    });
    if (!res.ok) {
      setError("Could not open file");
      return;
    }
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const tab = window.open(obj, "_blank", "noopener,noreferrer");
    if (!tab) {
      URL.revokeObjectURL(obj);
      setError(
        "Preview could not open (pop-up blocked). Allow pop-ups for this site, or use Download to save the file.",
      );
      return;
    }
    setTimeout(() => URL.revokeObjectURL(obj), 120_000);
  }

  async function removeAttachment(att: TaskAttachmentRow) {
    if (!canEdit) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/tasks/attachments/${encodeURIComponent(att.id)}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? "Remove failed");
      setAttachments((prev) => prev.filter((x) => x.id !== att.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  }

  function insertAtCursor(insert: string) {
    const ta = commentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = commentText;
    const next = v.slice(0, start) + insert + v.slice(end);
    setCommentText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setCommentText(v);
    const ta = e.target;
    const cur = ta.selectionStart;
    const before = v.slice(0, cur);
    const match = before.match(/@([\w.-]*)$/);
    if (match) {
      setMentionQuery(match[1] ?? "");
      setMentionOpen(true);
      const rect = ta.getBoundingClientRect();
      setMentionAnchor({ top: rect.bottom + 4, left: rect.left });
    } else {
      setMentionOpen(false);
    }
  }

  function pickMention(m: BoardMemberRow) {
    const ta = commentRef.current;
    if (!ta) return;
    const v = ta.value;
    const cur = ta.selectionStart;
    const before = v.slice(0, cur);
    const match = before.match(/@([\w.-]*)$/);
    if (!match) return;
    const start = before.lastIndexOf("@");
    const insert = `<@${m.id}> `;
    const next = v.slice(0, start) + insert + v.slice(cur);
    setCommentText(next);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  const mentionChoices = useMemo(
    () => fuzzyFilterMembers(mentionQuery, boardMembers).slice(0, 8),
    [mentionQuery, boardMembers]
  );

  const overdue =
    task?.deadline &&
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    new Date(task.deadline).getTime() < Date.now();

  const descForLinks = formatMentionsInText(draftDesc, nameById);

  return (
    <Modal
      open={open && Boolean(taskId)}
      onClose={onClose}
      size="2xl"
      title=""
      titleNode={
        <div className="flex w-full min-w-0 flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            {canEdit ? (
              <input
                className="w-full border-0 bg-transparent text-xl font-semibold tracking-tight text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Task title"
              />
            ) : (
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {task?.title ?? "Task"}
              </h2>
            )}
          </div>
          {canEdit ? (
            <Button
              type="button"
              className="shrink-0 text-sm"
              disabled={saving}
              onClick={() => void saveTask()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : task ? (
        <div className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
            <div className="min-w-[120px] flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</p>
              {canEdit ? (
                <Select
                  className="mt-1"
                  value={draftPriority}
                  onChange={(e) => setDraftPriority(e.target.value as TicketPriority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              ) : (
                <div className="mt-1">
                  <PriorityBadge priority={task.priority as TicketPriority} />
                </div>
              )}
            </div>
            <div className="min-w-[140px] flex-[2]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Color</p>
              {canEdit ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {BOARD_TASK_CARD_COLOR_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      title={id}
                      className={`h-7 w-7 rounded-full shadow-inner ring-2 ring-offset-1 ring-offset-white transition ${
                        boardTaskCardAccent[id].swatch
                      } ${
                        draftCardColor === id
                          ? "ring-primary-600"
                          : "ring-transparent hover:ring-slate-300"
                      }`}
                      onClick={() => setDraftCardColor(id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm capitalize text-slate-700">{draftCardColor}</p>
              )}
            </div>
            <div className="min-w-[160px] flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Due</p>
              {canEdit ? (
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  value={draftDeadline}
                  onChange={(e) => setDraftDeadline(e.target.value)}
                />
              ) : (
                <p
                  className={`mt-2 text-sm font-medium ${
                    overdue ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {task.deadline ? new Date(task.deadline).toLocaleString() : "—"}
                </p>
              )}
            </div>
            <div className="min-w-[100px] w-28">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Progress</p>
              {canEdit ? (
                <Select
                  value={String(draftProgress)}
                  onChange={(e) => setDraftProgress(Number(e.target.value))}
                >
                  <option value="0">0%</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                </Select>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-800">{task.progress ?? 0}%</p>
              )}
            </div>
            <div className="min-w-[160px] flex-[2]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assignee</p>
              {canEdit ? (
                <Select
                  className="mt-1"
                  value={draftAssignee}
                  onChange={(e) => setDraftAssignee(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {boardMembers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="mt-2 text-sm text-slate-800">{task.assignedTo?.name ?? "Unassigned"}</p>
              )}
            </div>
            {task.ticketId ? (
              <div className="min-w-0 flex-[2]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ticket</p>
                <p className="mt-2 truncate text-sm">
                  <Link
                    href={`/dashboard/tickets/view?id=${encodeURIComponent(task.ticketId)}`}
                    className="font-mono text-primary-600 underline"
                  >
                    {task.ticketCode ?? task.ticketId}
                  </Link>
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Attachments
              </h4>
              {canEdit ? (
                <label className="cursor-pointer text-xs font-medium text-primary-600 hover:underline">
                  {uploading ? "Uploading…" : "Add file"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadFile(f);
                    }}
                  />
                </label>
              ) : null}
            </div>
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-400">No attachments.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => void openAttachmentView(a)}
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="truncate font-medium text-slate-800">{a.originalName}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatBytes(a.size)}</span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-slate-500 hover:bg-white hover:text-primary-600"
                      title="Download"
                      onClick={(e) => {
                        e.stopPropagation();
                        void downloadAttachment(a);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 text-slate-500 hover:bg-white hover:text-red-600"
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeAttachment(a);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid min-h-[min(60vh,520px)] grid-cols-1 gap-6 border-t border-slate-100 pt-4 lg:grid-cols-2">
            <div className="flex min-h-0 min-w-0 flex-col">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
              {canEdit ? (
                <textarea
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  rows={12}
                  className="mt-2 min-h-[220px] w-full flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner"
                  placeholder="Write details… Paste links — they will be clickable in the preview below."
                />
              ) : null}
              <div
                className={`mt-2 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-800 ${canEdit ? "min-h-[120px]" : "min-h-[280px]"}`}
              >
                {canEdit ? (
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Preview (links & mentions)
                  </p>
                ) : null}
                <div className={`text-sm leading-relaxed ${canEdit ? "mt-2" : "mt-0"}`}>
                  {descForLinks.trim() ? (
                    renderTextWithUrls(descForLinks)
                  ) : (
                    <span className="text-slate-400">No description.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Comments</p>
              <ul className="mt-2 flex-1 space-y-3 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <li className="text-sm text-slate-400">No comments yet.</li>
                ) : (
                  comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm"
                    >
                      <p className="text-xs font-medium text-slate-800">
                        {c.user.name}{" "}
                        <span className="font-normal text-slate-500">
                          · {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </p>
                      <div className="mt-1 text-sm text-slate-700">
                        {renderTextWithUrls(formatMentionsInText(c.comment, nameById))}
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="relative mt-3 shrink-0 space-y-2 border-t border-slate-100 pt-3">
                <textarea
                  ref={commentRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Add a comment… @ to mention"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                    <Smile className="h-4 w-4 text-slate-400" aria-hidden />
                    {EMOJI_PICKS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className="rounded px-1 text-lg leading-none hover:bg-white"
                        onClick={() => insertAtCursor(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    className="text-sm"
                    disabled={sending || !commentText.trim()}
                    onClick={() => void submitComment()}
                  >
                    {sending ? "Sending…" : "Post"}
                  </Button>
                </div>
                {mentionOpen && mentionAnchor ? (
                  <div
                    className="fixed z-[700] max-h-48 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                    style={{ top: mentionAnchor.top, left: mentionAnchor.left }}
                  >
                    {mentionChoices.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
                    ) : (
                      mentionChoices.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => pickMention(m)}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                            {(m.name || "?")
                              .split(/\s+/)
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-900">{m.name}</span>
                            <span className="block truncate text-xs text-slate-500">{m.email}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No task selected.</p>
      )}
    </Modal>
  );
}
