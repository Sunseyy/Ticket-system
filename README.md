# Ticket System

Full-stack ticketing platform with role-based dashboards for clients, agents, and administrators. Clients create and monitor support requests, agents triage and resolve them, and admins oversee the full queue while managing users and companies.

## Features
- Responsive React dashboards tailored for client, agent, and admin roles
- Ticket lifecycle management with status, priority, product, and department metadata
- Admin tools to assign tickets, delete tickets, manage users, and curate the companies directory
- Role-aware routing with protected routes and contextual data sharing via React Router outlets
- PostgreSQL-backed Express API with sanitized inputs, admin-only safeguards, and comment threads

## Tech Stack
- Frontend: React 19, Vite, React Router 7, custom CSS modules
- Backend: Node.js 18+, Express 4, PostgreSQL (pg), bcrypt for password hashing
- Infrastructure: Docker Compose for local orchestration, PostgreSQL 15

## Project Structure
```
backend/                # Express API and database access layer
frontend/               # Vite + React single-page application
frontend/src/layout/    # Main layout, sidebar, topbar components
frontend/src/pages/     # Role dashboards, admin panels, ticket CRUD views
frontend/src/context/   # AuthContext for session, role, and outlet data
```

## Prerequisites
- Node.js 18 or later
- npm 10 or later
- Docker and Docker Compose (optional but recommended)
- PostgreSQL 15 if you run the stack outside Docker

## Quick Start (Docker Compose)
1. Copy the repository to your machine and open the folder.
2. Run `docker compose up --build` from the repository root.
3. Docker provisions three services:
   - `frontend` on http://localhost:5173
   - `backend` API on http://localhost:5000
   - `db` PostgreSQL instance on port 5432 with default credentials `postgres` / `postgres`
4. Apply the database schema (see [Database Schema Snapshot](#database-schema-snapshot)).
5. Create at least one admin user directly in the database so you can sign in to the admin dashboard.

## Manual Setup (without Docker)
1. Start PostgreSQL locally and create a database named `ticketing`.
2. Update the connection settings in `backend/server.js` (the default host is `db`; change to `localhost` if you are not using Docker).
3. Install backend dependencies and start the API:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. In a separate terminal, install frontend dependencies and start the Vite dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. The frontend expects the API at `http://localhost:5000`. Adjust fetch URLs if you host the backend elsewhere.
6. Seed the database with at least one admin account to access the admin tools.

## Database Schema Snapshot
Below is a minimal schema that satisfies the current queries. Adjust as needed for migrations or production.
```sql
CREATE TABLE societies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  society_id INTEGER REFERENCES societies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  product TEXT,
  category TEXT,
  department TEXT,
  priority TEXT,
  urgency TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by INTEGER NOT NULL REFERENCES users(id),
  assigned_agent_id INTEGER REFERENCES users(id),
  society_id INTEGER REFERENCES societies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Using the Provided Database Dump
- Import `database.sql` to preload the schema and sample data shipped with this repository:
  ```bash
  psql -U postgres -d ticketing -f database.sql
  ```
  Running under Docker? Copy the dump into the container, then execute it:
  ```bash
  docker compose cp database.sql db:/tmp/database.sql
  docker compose exec db psql -U postgres -d ticketing -f /tmp/database.sql
  ```
- The dump already includes role-specific accounts you can use for testing:
  | Role   | Email              | Password   |
  |--------|--------------------|------------|
  | Admin  | Admin@tnd.dz       | Admin@1234 |
  | Agent  | Agent@tnd.dz       | test       |
  | Client | Client@ooredoo.dz  | test       |
- Passwords are stored hashed in the database; the table above lists the plain-text credentials for signing in through the UI.

### Sample Admin Seed
```sql
INSERT INTO users (full_name, email, password_hash, role)
VALUES (
  'System Admin',
  'admin@example.com',
  '$2b$10$uKszrYdUi9Y1/OQwVsEU9uVhKQmpv2qXGz5D8teFlaN6pG9aTOwS2',
  'ADMIN'
);
-- Password for the hash above is: AdminPass123!
```

## Development Workflow
- The admin dashboard (`/dashboard`) provides quick metrics and calls to action.
- Admin sub routes:
  - `/dashboard/admin/all-tickets` – full queue with filters, assignments, and delete controls
  - `/dashboard/admin/manage-users` – user directory with ticket drill-down and delete actions
  - `/dashboard/admin/manage-companies` – CRUD interface for companies (societies)
- Agents work from `/dashboard/tickets` to monitor and claim tickets.
- Clients access `/dashboard/client` for their ticket history and `/create-ticket` to open new requests.

## Testing and Linting
- Frontend linting: `cd frontend && npm run lint`
- No automated tests are defined yet; use manual QA through the dashboards after each change.

## Deployment Notes
- Replace hard-coded origins and database credentials with environment variables before deploying.
- Serve the Vite build output (`npm run build`) through your static host and point it to the hosted API.
- Secure all secrets (database passwords, bcrypt salt rounds) via your platform’s configuration management.


