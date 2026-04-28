import type { TicketPriority, TicketStatus } from "@/lib/ticket-types";

export type BoardListItem = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  users: string[];
  notifyOnCompleteUsers: string[];
  createdAt: string;
};

export type BoardColumnRow = {
  id: string;
  name: string;
  boardId: string;
  order: number;
};

export type BoardTaskRow = {
  id: string;
  title: string;
  description: string;
  ticketId: string | null;
  ticketCode: string | null;
  ticketTitle: string | null;
  boardId: string;
  columnId: string;
  assignedTo: { id: string; name: string; email: string } | null;
  priority: TicketPriority;
  deadline: string | null;
  status: TicketStatus;
  order: number;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardBundle = {
  board: BoardListItem;
  columns: BoardColumnRow[];
  tasks: BoardTaskRow[];
};

export type TaskCommentRow = {
  id: string;
  taskId: string;
  user: { id: string; name: string; email: string };
  comment: string;
  createdAt: string;
};
