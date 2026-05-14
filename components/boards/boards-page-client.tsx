"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/auth-fetch";
import { useSession } from "@/lib/session-context";
import { parseUsersListJson } from "@/lib/users-api";
import type { BoardBundle, BoardListItem, BoardTaskRow } from "@/components/boards/board-types";
import { KanbanBoard } from "@/components/boards/kanban-board";
import { TaskDetailModal } from "@/components/boards/task-detail-modal";

type StaffUser = { id: string; name: string; email: string; role?: string };

export function BoardsPageClient() {
  const { user } = useSession();
  const isAdmin = user.role === "admin";

  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<BoardBundle | null>(null);
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
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskColumnId, setTaskColumnId] = useState("");
  const [taskTicketId, setTaskTicketId] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("p2");
  const [taskDeadline, setTaskDeadline] = useState("");

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

  async function addDefaultColumns() {
    if (!selectedId) return;
    const template = ["Todo", "In Progress", "Done"];
    for (const name of template) {
      const res = await apiFetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: selectedId, name }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? "Column create failed");
        return;
      }
    }
    await loadBundle(selectedId);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Task boards</h1>
          <p className="mt-1 text-sm text-slate-500">
            Internal Kanban — drag tasks between columns. Linked tickets sync status by column name
            (Todo / In Progress / Done).
          </p>
        </div>
        {isAdmin ? (
          <Button type="button" onClick={() => setCreateBoardOpen(true)} className="inline-flex gap-2">
            <Plus className="h-4 w-4" />
            New board
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardBody className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Boards</p>
            {loadingList ? (
              <p className="mt-2 text-sm text-slate-500">Loading…</p>
            ) : boards.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No boards yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {boards.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                        selectedId === b.id
                          ? "bg-primary-50 font-medium text-primary-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="truncate">{b.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {!selectedId ? (
            <Card>
              <CardBody className="p-8 text-center text-sm text-slate-500">
                Select a board to open the Kanban.
              </CardBody>
            </Card>
          ) : loadingBoard ? (
            <p className="text-sm text-slate-500">Loading board…</p>
          ) : bundle ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{bundle.board.name}</h2>
                  {bundle.board.description ? (
                    <p className="text-sm text-slate-500">{bundle.board.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isAdmin ? (
                    <>
                      <Button type="button" variant="secondary" onClick={() => void addDefaultColumns()}>
                        Add Todo / In Progress / Done
                      </Button>
                      <Button type="button" onClick={() => setTaskOpen(true)}>
                        New task
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {isAdmin ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Input
                    label="New column"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="e.g. Review"
                    className="min-w-[160px] flex-1"
                  />
                  <Button type="button" onClick={() => void addColumn()}>
                    Add column
                  </Button>
                </div>
              ) : null}

              <KanbanBoard
                columns={bundle.columns}
                tasks={bundle.tasks as BoardTaskRow[]}
                onMoved={() => selectedId && void loadBundle(selectedId)}
                onOpenTask={(id) => setTaskModalId(id)}
              />
            </>
          ) : null}
        </div>
      </div>

      <TaskDetailModal
        taskId={taskModalId}
        open={Boolean(taskModalId)}
        onClose={() => setTaskModalId(null)}
        onChanged={() => selectedId && void loadBundle(selectedId)}
      />

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
            {staffUsers.map((u) => (
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
