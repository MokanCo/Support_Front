"use client";

import { useState } from "react";
import { ListTree, MessageSquareLock } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/modal";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TicketActivityTimeline } from "@/components/tickets/ticket-activity-timeline";
import type { TicketActivityItem } from "@/lib/ticket-activity";
import { TicketNotesListSkeleton } from "@/components/ui/skeleton";
import type { TicketInternalNote } from "@/lib/ticket-internal-notes";
import {
  useTicketInternalNotes,
  useTicketNotesMutations,
} from "@/lib/queries/ticket-notes";

type Tab = "activity" | "notes";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isNoteAuthor(note: TicketInternalNote, currentUserId: string): boolean {
  return String(note.authorId).trim() === String(currentUserId).trim();
}

export function TicketDetailStaffSidebar({
  variant = "staff",
  ticketId,
  activities,
  readOnly,
  currentUserId,
}: {
  variant?: "staff" | "partner";
  ticketId: string;
  activities: TicketActivityItem[];
  readOnly: boolean;
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const isPartnerView = variant === "partner";
  const [tab, setTab] = useState<Tab>("notes");
  /** Internal notes are staff-only (admin/support); never fetch for partners. */
  const notesEnabled = !isPartnerView && tab === "notes";
  const {
    data: notes = [],
    isPending: notesLoading,
    error: notesQueryError,
  } = useTicketInternalNotes(ticketId, notesEnabled);
  const notesError = notesQueryError
    ? notesQueryError instanceof Error
      ? notesQueryError.message
      : "Failed to load notes"
    : null;
  const { create, update, remove } = useTicketNotesMutations(ticketId);
  const [draft, setDraft] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<TicketInternalNote | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const savingNote =
    create.isPending || update.isPending || remove.isPending;
  const displayNotesError = mutationError ?? notesError;

  async function submitNote() {
    if (isPartnerView) return;
    const text = draft.trim();
    if (!text || readOnly) return;
    setMutationError(null);
    try {
      await create.mutateAsync(text);
      setDraft("");
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  function openEditModal(note: TicketInternalNote) {
    setEditingNote(note);
    setEditDraft(note.body);
  }

  function closeEditModal() {
    setEditingNote(null);
    setEditDraft("");
  }

  async function saveEdit() {
    if (isPartnerView || !editingNote) return;
    const text = editDraft.trim();
    if (!text) return;
    setMutationError(null);
    try {
      await update.mutateAsync({ noteId: editingNote.id, text });
      closeEditModal();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function confirmDelete(noteId: string) {
    if (isPartnerView) return;
    const r = await Swal.fire({
      title: "Delete ticket note?",
      text: "This ticket note will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
    });
    if (!r.isConfirmed) return;
    setMutationError(null);
    try {
      await remove.mutateAsync(noteId);
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not delete",
        text: e instanceof Error ? e.message : "Delete failed",
      });
    }
  }

  const partnerNotesTab = (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-inner">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
        <MessageSquareLock className="h-3.5 w-3.5" aria-hidden />
        Ticket notes
      </span>
    </div>
  );

  const toggle = (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-inner">
      <button
        type="button"
        onClick={() => setTab("notes")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          tab === "notes"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <MessageSquareLock className="h-3.5 w-3.5" aria-hidden />
        Ticket notes
      </button>
      <button
        type="button"
        onClick={() => setTab("activity")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          tab === "activity"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <ListTree className="h-3.5 w-3.5" aria-hidden />
        Activity
      </button>
    </div>
  );

  const showComposer = !isPartnerView && !readOnly;
  const showPartnerFooter = isPartnerView;

  const notesListBody = (() => {
    if (notesLoading && notes.length === 0) {
      return <TicketNotesListSkeleton count={3} />;
    }
    if (displayNotesError && notes.length === 0) {
      return <p className="text-center text-sm text-red-600">{displayNotesError}</p>;
    }
    if (notes.length === 0) {
      return (
        <p className="max-w-[16rem] text-center text-sm text-slate-500">
          {isPartnerView
            ? "No ticket notes yet."
            : "No ticket notes yet. Add context for your team below."}
        </p>
      );
    }
    return (
      <ul className="relative w-full space-y-0">
        {notes.map((n, i) => {
          const canManage = !readOnly && !isPartnerView && isNoteAuthor(n, currentUserId);
          return (
            <li key={n.id} className="relative flex gap-0 pb-8 last:pb-2">
              {i < notes.length - 1 ? (
                <span
                  className="absolute left-[0.6rem] top-3 bottom-0 w-px bg-slate-200"
                  aria-hidden
                />
              ) : null}
              <div className="relative z-[1] flex w-5 shrink-0 justify-center pt-1">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500 ring-4 ring-white" />
              </div>
              <div className="min-w-0 flex-1 pl-3">
                <div className="flex items-start justify-between gap-2">
                  <time
                    className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                    dateTime={n.createdAt}
                  >
                    {formatWhen(n.createdAt)}
                    <span className="sr-only"> — {n.authorName}</span>
                  </time>
                  {canManage ? (
                    <RowActionsMenu
                      align="right"
                      aria-label={`Actions for note by ${n.authorName}`}
                      items={[
                        {
                          id: "edit",
                          label: "Edit",
                          onClick: () => openEditModal(n),
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          danger: true,
                          onClick: () => void confirmDelete(n.id),
                        },
                      ]}
                    />
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {n.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  })();

  return (
    <>
      <Card className="flex h-full min-h-[min(420px,calc(100dvh-10rem))] flex-1 flex-col overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader action={isPartnerView ? partnerNotesTab : toggle} />
        <CardBody className="flex min-h-0 flex-1 flex-col p-0">
          {!isPartnerView && tab === "activity" ? (
            <TicketActivityTimeline items={activities} embedded />
          ) : (
            <div
              className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]"
              style={{ minHeight: 0 }}
            >
              <div
                className={`min-h-0 overflow-y-auto overscroll-contain ${
                  notes.length === 0 && !notesLoading
                    ? "flex items-center justify-center px-5 py-6"
                    : "px-5 py-4"
                }`}
              >
                {notesListBody}
              </div>

              {displayNotesError && notes.length > 0 ? (
                <p className="shrink-0 border-t border-slate-100 px-5 py-2 text-xs text-red-600">
                  {displayNotesError}
                </p>
              ) : null}

              {showPartnerFooter ? (
                readOnly ? (
                  <p className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-center text-xs text-slate-500">
                    This ticket is closed — ticket notes are read-only.
                  </p>
                ) : (
                  <p className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-center text-xs text-slate-500">
                    Ticket notes are read-only. Support staff can add or edit notes.
                  </p>
                )
              ) : showComposer ? (
                <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
                  <Textarea
                    label="New ticket note"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder="Add a note for your team…"
                    className="bg-white text-sm"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingNote || !draft.trim()}
                      onClick={() => void submitNote()}
                    >
                      {savingNote ? "Saving…" : "Add note"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-center text-xs text-slate-500">
                  This ticket is closed — ticket notes are read-only.
                </p>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={editingNote !== null}
        onClose={closeEditModal}
        title="Edit ticket note"
        description="Update your note. Only you can edit notes you created."
      >
        <Textarea
          label="Note"
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          rows={5}
          className="text-sm"
        />
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeEditModal} disabled={savingNote}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={savingNote || !editDraft.trim()}
            onClick={() => void saveEdit()}
          >
            {savingNote ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
