# Mokanco Support (MVP)

Organization-scoped support ticketing with JWT sessions (HTTP-only cookies), role-based access (admin, support, partner), and a **separate Express + MongoDB API** in the sibling `backend` folder (all persistence and seeds live there).

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Set `BACKEND_API_URL` (e.g. `http://localhost:5000`) and `JWT_SECRET` (same value as the backend, at least 32 random characters). The app does not connect to MongoDB directly.

3. In the **backend** repo, set `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL`, then install, run the API, and seed:

   ```bash
   cd ../backend
   npm install
   npm run dev
   npm run seed
   ```

   Default seed password is in the backend script output (or set `SEED_PASSWORD`).

4. Install and run this **frontend**:

   ```bash
   npm install
   npm run dev
   ```

   Then open `http://localhost:3000/login` and sign in with a seeded account from the backend.

## Roles

- **Admin**: organizations, users, all tickets, assign and update status.
- **Support**: all tickets with filters, assign and update status.
- **Partner**: tickets for their organization only, create tickets, messaging.

There is no public registration; admins create users via the admin panel.

## Task boards (Kanban)

Internal Trello-style boards for **admin** and **support** only (`/dashboard/boards`). Partners cannot access this page.

- **Backend**: The **Express + MongoDB** app in the sibling `backend` folder owns collections `boards`, `board_columns`, `board_tasks`, `task_comments` and serves `/api/boards`, `/api/columns`, `/api/tasks`, `POST /api/tasks/move`, and task comments under `/api/tasks/comments`. Use the same `BACKEND_API_URL` / `NEXT_PUBLIC_API_URL` as tickets and auth (default `http://localhost:5000`).

- **Drag and drop**: Moving a card calls `POST /api/tasks/move` with `{ taskId, destinationColumnId, newOrder }`. If the task has a `ticketId`, ticket **status** follows the destination column name (e.g. Done-like columns map to `completed`).

- **Email**: When a card enters a Done-like column, completion notifications use **SMTP env vars on the backend** (`backend/.env.example`). If SMTP is not configured, the backend logs instead of sending.
