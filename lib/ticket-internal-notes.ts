import { apiFetch } from "@/lib/auth-fetch";

export type TicketInternalNote = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  authorRole: string;
};

export async function fetchTicketInternalNotes(ticketId: string): Promise<TicketInternalNote[]> {
  const res = await apiFetch(`/api/tickets/${encodeURIComponent(ticketId)}/internal-notes`);
  const j = (await res.json()) as { notes?: TicketInternalNote[]; error?: string };
  if (!res.ok) throw new Error(j.error ?? "Failed to load notes");
  return Array.isArray(j.notes) ? j.notes : [];
}

export async function postTicketInternalNote(
  ticketId: string,
  body: string,
): Promise<TicketInternalNote> {
  const res = await apiFetch(`/api/tickets/${encodeURIComponent(ticketId)}/internal-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const j = (await res.json()) as { note?: TicketInternalNote; error?: string };
  if (!res.ok) throw new Error(j.error ?? "Failed to add note");
  if (!j.note) throw new Error("Invalid response");
  return j.note;
}

export async function patchTicketInternalNote(
  ticketId: string,
  noteId: string,
  body: string,
): Promise<TicketInternalNote> {
  const res = await apiFetch(
    `/api/tickets/${encodeURIComponent(ticketId)}/internal-notes/${encodeURIComponent(noteId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  const j = (await res.json()) as { note?: TicketInternalNote; error?: string };
  if (!res.ok) throw new Error(j.error ?? "Failed to update note");
  if (!j.note) throw new Error("Invalid response");
  return j.note;
}

export async function deleteTicketInternalNote(ticketId: string, noteId: string): Promise<void> {
  const res = await apiFetch(
    `/api/tickets/${encodeURIComponent(ticketId)}/internal-notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE" },
  );
  const j = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(j.error ?? "Failed to delete note");
}
