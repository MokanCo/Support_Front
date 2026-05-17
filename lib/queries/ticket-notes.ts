import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteTicketInternalNote,
  fetchTicketInternalNotes,
  patchTicketInternalNote,
  postTicketInternalNote,
  type TicketInternalNote,
} from "@/lib/ticket-internal-notes";
import { queryKeys } from "@/lib/query-keys";

export function useTicketInternalNotes(
  ticketId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.tickets.notes(ticketId),
    queryFn: () => fetchTicketInternalNotes(ticketId),
    enabled: Boolean(ticketId) && enabled,
  });
}

export function useTicketNotesMutations(ticketId: string) {
  const queryClient = useQueryClient();
  const notesKey = queryKeys.tickets.notes(ticketId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: notesKey });

  const create = useMutation({
    mutationFn: (text: string) => postTicketInternalNote(ticketId, text),
    onSuccess: (created) => {
      queryClient.setQueryData<TicketInternalNote[]>(notesKey, (prev) => [
        ...(prev ?? []),
        created,
      ]);
    },
  });

  const update = useMutation({
    mutationFn: ({ noteId, text }: { noteId: string; text: string }) =>
      patchTicketInternalNote(ticketId, noteId, text),
    onSuccess: (updated) => {
      queryClient.setQueryData<TicketInternalNote[]>(notesKey, (prev) =>
        (prev ?? []).map((n) => (n.id === updated.id ? updated : n)),
      );
    },
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteTicketInternalNote(ticketId, noteId),
    onSuccess: (_data, noteId) => {
      queryClient.setQueryData<TicketInternalNote[]>(notesKey, (prev) =>
        (prev ?? []).filter((n) => n.id !== noteId),
      );
    },
  });

  return { create, update, remove, invalidate };
}
