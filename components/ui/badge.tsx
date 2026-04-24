import type { TicketPriority, TicketStatus } from "@/models/Ticket";

const statusClass: Record<TicketStatus, string> = {
  in_queue: "bg-slate-100 text-slate-700 ring-slate-200/80",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200/80",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  cancelled: "bg-red-50 text-red-800 ring-red-200/80",
};

const statusLabel: Record<TicketStatus, string> = {
  in_queue: "In queue",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const priorityClass: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-700 ring-slate-200/80",
  medium: "bg-blue-50 text-blue-800 ring-blue-200/80",
  high: "bg-orange-50 text-orange-800 ring-orange-200/80",
  urgent: "bg-red-50 text-red-800 ring-red-200/80",
};

const priorityLabel: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityClass[priority]}`}
    >
      {priorityLabel[priority]}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
      New
    </span>
  );
}
