import { apiFetch } from "@/lib/auth-fetch";
import type {
  BoardTaskRow,
  TaskAttachmentRow,
  TaskCommentRow,
} from "@/components/boards/board-types";
import { queryKeys } from "@/lib/query-keys";

export type TaskDetailBundle = {
  task: BoardTaskRow;
  comments: TaskCommentRow[];
  attachments: TaskAttachmentRow[];
};

export async function fetchTaskDetail(taskId: string): Promise<BoardTaskRow> {
  const res = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load task");
  return json.task as BoardTaskRow;
}

export async function fetchTaskComments(taskId: string): Promise<TaskCommentRow[]> {
  const res = await apiFetch(
    `/api/tasks/comments?taskId=${encodeURIComponent(taskId)}`,
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load comments");
  return (json.comments as TaskCommentRow[]) ?? [];
}

export async function fetchTaskAttachments(taskId: string): Promise<TaskAttachmentRow[]> {
  const res = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/attachments`);
  const json = res.ok ? await res.json() : { attachments: [] };
  return (json.attachments as TaskAttachmentRow[]) ?? [];
}

export async function fetchTaskDetailBundle(taskId: string): Promise<TaskDetailBundle> {
  const [task, comments, attachments] = await Promise.all([
    fetchTaskDetail(taskId),
    fetchTaskComments(taskId),
    fetchTaskAttachments(taskId),
  ]);
  return { task, comments, attachments };
}

export function taskDetailQueryKey(taskId: string) {
  return queryKeys.tasks.detail(taskId);
}
