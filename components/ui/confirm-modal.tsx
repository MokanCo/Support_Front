"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
