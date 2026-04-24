"use client";

import { Modal } from "@/components/ui/modal";
import type { UserRole } from "@/models/User";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

export function CreateTicketModal({
  open,
  onClose,
  role,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  onCreated: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create ticket"
      description="Submit a new request to the support queue."
      size="lg"
    >
      {open ? (
        <CreateTicketForm
          role={role}
          showCancel
          onCancel={onClose}
          onSuccess={() => {
            onCreated();
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}
