import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson } from "@/lib/users-api";
import type { BoardBundle, BoardListItem, BoardMemberRow } from "@/components/boards/board-types";
import { queryKeys } from "@/lib/query-keys";

export async function fetchBoardsList(): Promise<BoardListItem[]> {
  const res = await apiFetch("/api/boards");
  const j = await res.json();
  if (!res.ok) throw new Error(j.error ?? "Failed to load boards");
  return (j.boards as BoardListItem[]) ?? [];
}

export async function fetchBoardBundle(boardId: string): Promise<BoardBundle> {
  const res = await apiFetch(`/api/boards/${encodeURIComponent(boardId)}`);
  const j = await res.json();
  if (!res.ok) throw new Error(j.error ?? "Failed to load board");
  return j as BoardBundle;
}

export async function fetchBoardMembers(boardId: string): Promise<BoardMemberRow[]> {
  const res = await apiFetch(
    `/api/board/members?boardId=${encodeURIComponent(boardId)}`,
  );
  const j = await res.json();
  if (!res.ok) return [];
  return (j.members as BoardMemberRow[]) ?? [];
}

export type StaffUser = { id: string; name: string; email: string; role?: string };

export async function fetchBoardStaffUsers(): Promise<StaffUser[]> {
  const res = await apiFetch("/api/users");
  const data: unknown = await res.json();
  if (!res.ok) return [];
  const list = parseUsersListJson(data) as StaffUser[];
  return list.filter((u) => u.role === "admin" || u.role === "support");
}

export const boardsListQueryOptions = {
  queryKey: queryKeys.boards.list(),
  queryFn: fetchBoardsList,
} as const;
