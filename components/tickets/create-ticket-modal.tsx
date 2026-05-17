"use client";

import { Modal } from "@/components/ui/modal";
import type { UserRole } from "@/lib/user-roles";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { getQuickTicketTemplate } from "@/lib/quick-ticket-templates";

export function CreateTicketModal({
  open,
  onClose,
  role,
  onCreated,
  quickTemplateId,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  onCreated?: (ticketId: string) => void;
  /** Pre-fill from a quick template (e.g. partner dashboard cards). */
  quickTemplateId?: string | null;
}) {
  const template = getQuickTicketTemplate(quickTemplateId);
  const title = template ? `New ticket: ${template.label}` : "Create ticket";
  const description = template
    ? "Review the pre-filled details and submit when ready."
    : "Submit a new request to the ticket queue.";

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="lg">
      {open ? (
        <CreateTicketForm
          key={quickTemplateId ?? "__blank__"}
          role={role}
          quickTemplateId={quickTemplateId ?? undefined}
          showCancel
          onCancel={onClose}
          onSuccess={(id) => {
            onCreated?.(id);
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}
