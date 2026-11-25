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

   Before production, remove demo seed accounts:

   ```bash
   npm run remove-demo
   ```
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

## AI Receptionist

The module lives in the existing portal at `/dashboard/ai-receptionist` and is limited to admins. Its API is the same Express app. Swagger UI is `{API_PUBLIC_URL}/api-docs`, with the Phone Numbers, AI Agent, Knowledge Base, Branches, Call History, Recordings & Transcripts, Analytics, Telephony, System Settings, and Webhooks tags. The spec JSON is `/api-docs.json`.

Authorize with the portal JWT from `POST /api/auth/login`. Voice webhooks do not use that JWT. They require Bandwidth HTTP Basic auth and `API_PUBLIC_URL`.

Set these only on the API server:

- `OPENAI_API_KEY` and optional `OPENAI_MODEL`
- `BANDWIDTH_CLIENT_ID` and `BANDWIDTH_CLIENT_SECRET` (from Bandwidth Build → Your API credentials, used to download recordings)
- `BANDWIDTH_VOICE_APPLICATION_ID`
- `BANDWIDTH_WEBHOOK_USERNAME` and `BANDWIDTH_WEBHOOK_PASSWORD` (a pair you choose and enter on the Bandwidth voice application)
- `API_PUBLIC_URL` (public HTTPS origin Bandwidth can reach, no trailing slash)

Webhook paths, after a carrier change is explicitly approved:

- `POST /api/ai-receptionist/voice/inbound`
- `POST /api/ai-receptionist/voice/gather`
- `POST /api/ai-receptionist/voice/dial-status`
- `POST /api/ai-receptionist/voice/status`
- `POST /api/ai-receptionist/voice/recording`

Admin endpoints (portal JWT, role `admin`):

- `GET/POST /api/ai-receptionist/phone-numbers`, `GET/PATCH/DELETE /api/ai-receptionist/phone-numbers/{id}`, `POST /api/ai-receptionist/phone-numbers/{id}/test`
- `GET /api/ai-receptionist/overview`
- `GET/PUT/DELETE /api/ai-receptionist/agent-settings`
- `GET/POST /api/ai-receptionist/knowledge`, `POST /api/ai-receptionist/knowledge/import/preview`, `POST /api/ai-receptionist/knowledge/import`, `GET/PATCH/DELETE /api/ai-receptionist/knowledge/{id}`
- `GET /api/ai-receptionist/branches`, `GET/PUT /api/ai-receptionist/branches/{locationId}`
- `GET /api/ai-receptionist/calls`, `GET/PATCH /api/ai-receptionist/calls/{id}`
- `GET /api/ai-receptionist/recordings`, `GET /api/ai-receptionist/recordings/{callId}`, `GET /api/ai-receptionist/recordings/{callId}/audio`
- `GET /api/ai-receptionist/analytics`, `GET /api/ai-receptionist/analytics/export`
- `GET/PATCH /api/ai-receptionist/settings`, `GET /api/ai-receptionist/health`, `GET /api/ai-receptionist/audit`

Do not point a production number at the voice URLs until that approval. Saving a phone configuration does not transfer, port, or disconnect the carrier number. The receptionist refuses orders and card details and offers a transfer instead. Recording audio is proxied to signed-in admins and is not returned as a public media URL.

Deploy the API with the existing process (`npm start` in `Support_Backend`) and the frontend with the existing static export (`npm run build`, then serve `out`). Existing portal routes are unchanged.
