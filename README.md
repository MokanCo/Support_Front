# Mokanco Support (MVP)

Organization-scoped support ticketing with JWT sessions (HTTP-only cookies), MongoDB, and role-based access (admin, support, partner).

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Set `MONGODB_URI` (MongoDB Atlas connection string) and `JWT_SECRET` (at least 32 random characters).

3. Install and run (includes `lucide-react` and `recharts` for the dashboard UI):

   ```bash
   npm install
   npm run dev
   ```

4. Seed demo users and one organization:

   ```bash
   npm run seed
   ```

   Then sign in at `http://localhost:3000/login` with any seeded account (`password123`).

## Roles

- **Admin**: organizations, users, all tickets, assign and update status.
- **Support**: all tickets with filters, assign and update status.
- **Partner**: tickets for their organization only, create tickets, messaging.

There is no public registration; admins create users via the admin panel.
