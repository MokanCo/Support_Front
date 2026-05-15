"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronDown, Settings, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/auth-fetch";
import { useSession } from "@/lib/session-context";
import { parseUsersListJson } from "@/lib/users-api";
import type {
  BoardBundle,
  BoardListItem,
  BoardMemberRow,
  BoardTaskRow,
} from "@/components/boards/board-types";
import { KanbanBoard } from "@/components/boards/kanban-board";
import { TaskDetailDrawer } from "@/components/boards/task-detail-drawer";
import { BOARD_TASK_CARD_COLOR_IDS, boardTaskCardAccent } from "@/lib/board-task-card-colors";

const HIDDEN_COLS_STORAGE_PREFIX = "boardHiddenCols:";

type StaffUser = { id: string; name: string; email: string; role?: string };

export function BoardsPageClient() {
  const { user } = useSession();
  const isAdmin = user.role === "admin";
  const isSupport = user.role === "support";
  const canEditTasks = isAdmin || isSupport;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<BoardBundle | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMemberRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taskModalId, setTaskModalId] = useState<string | null>(null);

  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardDesc, setBoardDesc] = useState("");
  const [boardUserIds, setBoardUserIds] = useState<string[]>([]);
  const [notifyUserIds, setNotifyUserIds] = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [newColName, setNewColName] = useState("");
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [hiddenColIds, setHiddenColIds] = useState<string[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskColumnId, setTaskColumnId] = useState("");
  const [taskTicketId, setTaskTicketId] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("p2");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskCardColor, setTaskCardColor] = useState<string>("gray");
  const [taskProgress, setTaskProgress] = useState(0);

  const loadBoards = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await apiFetch("/api/boards");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to load boards");
      setBoards((j.boards as BoardListItem[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadBundle = useCallback(async (boardId: string) => {
    setLoadingBoard(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/boards/${encodeURIComponent(boardId)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to load board");
      setBundle(j as BoardBundle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBundle(null);
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (selectedId) void loadBundle(selectedId);
    else setBundle(null);
  }, [selectedId, loadBundle]);

  useEffect(() => {
    if (!selectedId) {
      setHiddenColIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`${HIDDEN_COLS_STORAGE_PREFIX}${selectedId}`);
      setHiddenColIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setHiddenColIds([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (loadingList || boards.length === 0) return;
    if (selectedId && boards.some((b) => b.id === selectedId)) return;
    setSelectedId(boards[0]?.id ?? null);
  }, [loadingList, boards, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setBoardMembers([]);
      return;
    }
    void (async () => {
      try {
        const res = await apiFetch(
          `/api/board/members?boardId=${encodeURIComponent(selectedId)}`
        );
        const j = await res.json();
        if (!res.ok) return;
        setBoardMembers((j.members as BoardMemberRow[]) ?? []);
      } catch {
        setBoardMembers([]);
      }
    })();
  }, [selectedId]);

  useEffect(() => {
    const t = searchParams.get("task");
    const b = searchParams.get("board");
    if (!selectedId) {
      setTaskModalId(null);
      return;
    }
    if (t && b === selectedId) setTaskModalId(t);
    else if (!t || b !== selectedId) setTaskModalId(null);
  }, [searchParams, selectedId]);

  useEffect(() => {
    const b = searchParams.get("board");
    const t = searchParams.get("task");
    if (!b || !t || boards.length === 0) return;
    if (boards.some((x) => x.id === b) && selectedId !== b) setSelectedId(b);
  }, [boards, searchParams, selectedId]);

  const openTask = useCallback(
    (id: string) => {
      setTaskModalId(id);
      if (!selectedId) return;
      const q = new URLSearchParams(searchParams.toString());
      q.set("board", selectedId);
      q.set("task", id);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, selectedId]
  );

  const closeTask = useCallback(() => {
    setTaskModalId(null);
    const q = new URLSearchParams(searchParams.toString());
    q.delete("task");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!createBoardOpen || !isAdmin) return;
    void (async () => {
      try {
        const res = await apiFetch("/api/users");
        const j = await res.json();
        if (!res.ok) return;
        const raw = parseUsersListJson(j) as Record<string, unknown>[];
        const mapped: StaffUser[] = raw
          .filter((u) => u && (u.role === "admin" || u.role === "support"))
          .map((u) => ({
            id: String(u.id ?? u._id),
            name: String(u.name ?? ""),
            email: String(u.email ?? ""),
            role: u.role as string | undefined,
          }));
        setStaffUsers(mapped);
      } catch {
        /* ignore */
      }
    })();
  }, [createBoardOpen, isAdmin]);

  const sortedColumns = useMemo(() => {
    if (!bundle) return [];
    return [...bundle.columns].sort((a, b) => a.order - b.order);
  }, [bundle]);

  const visibleColumns = useMemo(
    () => sortedColumns.filter((c) => !hiddenColIds.includes(c.id)),
    [sortedColumns, hiddenColIds]
  );

  const taskCountByColumnId = useMemo(() => {
    const m: Record<string, number> = {};
    if (!bundle) return m;
    for (const t of bundle.tasks) {
      m[t.columnId] = (m[t.columnId] ?? 0) + 1;
    }
    return m;
  }, [bundle]);

  function persistHiddenCols(next: string[]) {
    if (!selectedId) return;
    try {
      localStorage.setItem(`${HIDDEN_COLS_STORAGE_PREFIX}${selectedId}`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function toggleColumnHidden(colId: string) {
    setHiddenColIds((prev) => {
      const next = prev.includes(colId) ? prev.filter((x) => x !== colId) : [...prev, colId];
      persistHiddenCols(next);
      return next;
    });
  }

  useEffect(() => {
    if (sortedColumns[0] && !taskColumnId) setTaskColumnId(sortedColumns[0].id);
  }, [sortedColumns, taskColumnId]);

  async function createBoard() {
    if (!boardName.trim()) return;
    setError(null);
    try {
      const res = await apiFetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: boardName.trim(),
          description: boardDesc.trim(),
          users: boardUserIds,
          notifyOnCompleteUsers: notifyUserIds,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setCreateBoardOpen(false);
      setBoardName("");
      setBoardDesc("");
      setBoardUserIds([]);
      setNotifyUserIds([]);
      await loadBoards();
      if (j.id) setSelectedId(j.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function addColumn() {
    if (!selectedId || !newColName.trim()) return;
    const res = await apiFetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: selectedId, name: newColName.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Failed");
      return;
    }
    setNewColName("");
    await loadBundle(selectedId);
  }

  async function deleteColumn(colId: string) {
    if (!selectedId) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/columns/${encodeURIComponent(colId)}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? "Delete failed");
      setHiddenColIds((prev) => {
        const next = prev.filter((x) => x !== colId);
        persistHiddenCols(next);
        return next;
      });
      await loadBundle(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function createTask() {
    if (!selectedId || !taskTitle.trim() || !taskColumnId) return;
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        boardId: selectedId,
        columnId: taskColumnId,
        priority: taskPriority,
      };
      if (taskTicketId.trim()) body.ticketId = taskTicketId.trim();
      if (taskAssignee) body.assignedTo = taskAssignee;
      if (taskDeadline) body.deadline = new Date(taskDeadline).toISOString();
      body.cardColor = taskCardColor;
      body.progress = taskProgress;
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setTaskOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskTicketId("");
      setTaskAssignee("");
      setTaskPriority("p2");
      setTaskDeadline("");
      setTaskCardColor("gray");
      setTaskProgress(0);
      await loadBundle(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  function toggleUser(id: string, list: string[], setList: (v: string[]) => void) {
    if (list.includes(id)) setList(list.filter((x) => x !== id));
    else setList([...list, id]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="border-b border-slate-200/60 pb-3">
        <div className="flex flex-nowrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {loadingList ? (
              <span className="text-sm text-slate-400">Loading…</span>
            ) : boards.length === 0 ? (
              <span className="truncate text-lg font-semibold tracking-tight text-slate-900">
                No boards
              </span>
            ) : (
              <div className="relative flex min-w-0 max-w-[min(100%,28rem)] flex-1 items-center">
                <select
                  aria-label="Select board"
                  className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent py-1.5 pl-0 pr-8 text-lg font-semibold tracking-tight text-slate-900 shadow-none focus:outline-none focus:ring-0"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value || null)}
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <Button
                type="button"
                variant="secondary"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap px-3 text-sm"
                onClick={() => setCreateBoardOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New board
              </Button>
            ) : null}
            {isAdmin && bundle ? (
              <Button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap px-3 text-sm"
                onClick={() => setTaskOpen(true)}
              >
                New task
              </Button>
            ) : null}
            {isAdmin && bundle ? (
              <button
                type="button"
                title="Column settings"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => setColumnSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="min-h-0 min-w-0 flex-1">
        {!loadingList && boards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
            <p className="text-sm text-slate-600">
              {isAdmin ? "Create a board to start tracking work on the Kanban." : "No boards assigned."}
            </p>
            {isAdmin ? (
              <Button type="button" className="mt-4" onClick={() => setCreateBoardOpen(true)}>
                Create board
              </Button>
            ) : null}
          </div>
        ) : null}
        {selectedId && loadingBoard ? (
          <p className="text-sm text-slate-500">Loading board…</p>
        ) : null}
        {bundle && !loadingBoard ? (
          visibleColumns.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-950">
              All columns are hidden on this board. Use the{" "}
              <span className="font-semibold">gear</span> icon to show at least one column.
            </div>
          ) : (
            <KanbanBoard
              columns={visibleColumns}
              tasks={bundle.tasks as BoardTaskRow[]}
              onMoved={() => selectedId && void loadBundle(selectedId)}
              onOpenTask={openTask}
              canAddTask={isAdmin}
              onAddTask={(columnId) => {
                setTaskColumnId(columnId);
                setTaskOpen(true);
              }}
            />
          )
        ) : null}
      </div>

      <TaskDetailDrawer
        taskId={taskModalId}
        open={Boolean(taskModalId)}
        onClose={closeTask}
        onChanged={() => selectedId && void loadBundle(selectedId)}
        boardMembers={boardMembers}
        canEdit={canEditTasks}
      />

      <Modal
        open={columnSettingsOpen}
        onClose={() => setColumnSettingsOpen(false)}
        title="Column settings"
        size="lg"
      >
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {sortedColumns.map((c) => {
            const count = taskCountByColumnId[c.id] ?? 0;
            const hidden = hiddenColIds.includes(c.id);
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {count} task{count === 1 ? "" : "s"} · {hidden ? "Hidden on board" : "Visible"}
                  </p>
                </div>
                <button
                  type="button"
                  title={hidden ? "Show on board" : "Hide on board"}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  onClick={() => toggleColumnHidden(c.id)}
                >
                  {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  title="Remove column"
                  disabled={count > 0}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => void deleteColumn(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <Input
            label="New column"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="e.g. Review"
            className="min-w-[200px] flex-1"
          />
          <Button type="button" onClick={() => void addColumn()}>
            Add column
          </Button>
        </div>
      </Modal>

      <Modal open={createBoardOpen} onClose={() => setCreateBoardOpen(false)} title="Create board" size="lg">
        <div className="space-y-4">
          <Input label="Name" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          <Input
            label="Description"
            value={boardDesc}
            onChange={(e) => setBoardDesc(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-slate-700">Assign support / admin users</p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {staffUsers.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={boardUserIds.includes(u.id)}
                      onChange={() => toggleUser(u.id, boardUserIds, setBoardUserIds)}
                    />
                    <span>
                      {u.name} <span className="text-slate-400">({u.email})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Notify on completion (Done column)</p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {staffUsers.map((u) => (
                <li key={`n-${u.id}`}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notifyUserIds.includes(u.id)}
                      onChange={() => toggleUser(u.id, notifyUserIds, setNotifyUserIds)}
                    />
                    <span>{u.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateBoardOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createBoard()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="New task" size="lg">
        <div className="space-y-3">
          <Input label="Title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <Select label="Column" value={taskColumnId} onChange={(e) => setTaskColumnId(e.target.value)}>
            {sortedColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Linked ticket id (optional)"
            value={taskTicketId}
            onChange={(e) => setTaskTicketId(e.target.value)}
            placeholder="MongoDB ObjectId of ticket"
          />
          <Select label="Assignee" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
            <option value="">—</option>
            {(boardMembers.length > 0 ? boardMembers : staffUsers).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select label="Priority" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
            <option value="p0">P0</option>
            <option value="p1">P1</option>
            <option value="p2">P2</option>
            <option value="p3">P3</option>
            <option value="p4">P4</option>
          </Select>
          <div>
            <p className="text-sm font-medium text-slate-700">Card color</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BOARD_TASK_CARD_COLOR_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  title={id}
                  className={`h-9 w-9 rounded-full shadow-inner ring-2 ring-offset-2 ring-offset-white transition ${
                    boardTaskCardAccent[id].swatch
                  } ${taskCardColor === id ? "ring-primary-600" : "ring-transparent hover:ring-slate-300"}`}
                  onClick={() => setTaskCardColor(id)}
                />
              ))}
            </div>
          </div>
          <Select
            label="Progress"
            value={String(taskProgress)}
            onChange={(e) => setTaskProgress(Number(e.target.value))}
          >
            <option value="0">0%</option>
            <option value="25">25%</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
          </Select>
          <Input
            label="Deadline"
            type="datetime-local"
            value={taskDeadline}
            onChange={(e) => setTaskDeadline(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createTask()}>
              Create task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
