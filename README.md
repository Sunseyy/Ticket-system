# Ticket System

Full-stack ticketing platform with role-based dashboards for clients, agents, and administrators. Clients create and monitor support requests, agents triage and resolve them, and admins oversee the full queue while managing users and companies.

## Features
- Responsive React dashboards tailored for client, agent, and admin roles
- Ticket lifecycle management with status, priority, product, and department metadata
- Admin tools to assign tickets, delete tickets, manage users, and curate the companies directory
- Role-aware routing with protected routes and contextual data sharing via React Router outlets
- PostgreSQL-backed Express API with sanitized inputs, admin-only safeguards, and comment threads
- File attachments support with image previews
- Production-ready Docker setup with Nginx and health checks

## Tech Stack
- **Frontend:** React 19, Vite, React Router 7, Nginx (production)
- **Backend:** Node.js 20, Express 4, PostgreSQL (pg), bcrypt, Multer
- **Infrastructure:** Docker Compose, PostgreSQL 15-alpine, multi-stage builds

## Project Structure
```
├── backend/                # Express API and database access layer
│   ├── Dockerfile          # Production-ready multi-stage build
│   ├── server.js           # Main API server with env configuration
│   └── uploads/            # User-uploaded files
├── frontend/               # Vite + React single-page application
│   ├── Dockerfile          # Multi-stage build with Nginx
│   ├── Dockerfile.dev      # Development build with Vite hot reload
│   ├── nginx.conf          # Production Nginx configuration
│   └── src/
│       ├── config/api.js   # Centralized API configuration
│       ├── context/        # AuthContext for session management
│       ├── layout/         # Main layout, sidebar, topbar
│       └── pages/          # Role dashboards, admin panels, tickets
├── docker-compose.yml      # Production configuration
├── docker-compose.dev.yml  # Development override (hot reload)
├── .env.example            # Environment variables template
└── database.sql            # Schema and seed data
```

## Prerequisites
- Docker and Docker Compose v2+
- (Optional) Node.js 20+ and npm 10+ for local development without Docker

## Quick Start (Production Mode)

```bash
# 1. Clone the repository
git clone https://github.com/Sunseyy/Ticket-system.git
cd Ticket-system

# 2. Copy environment template
cp .env.example .env

# 3. Build and start all services
docker compose up --build

# 4. Access the application
#    Frontend: http://localhost
#    Backend API: http://localhost:5000
#    Database: localhost:5432
```

## Development Mode (Hot Reload)

For development with Vite's hot module replacement:

```bash
# Use both compose files
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Frontend with hot reload: http://localhost:5173
# Backend API: http://localhost:5000
```

## Environment Variables

All configuration is externalized via environment variables. Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `DB_HOST` | `db` | Database hostname |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `ticketing` | Database name |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `BACKEND_PORT` | `5000` | Backend API port |
| `FRONTEND_PORT` | `80` | Frontend port (production) |
| `VITE_API_URL` | `http://localhost:5000` | API URL for frontend |
| `CORS_ORIGINS` | `http://localhost:80,...` | Allowed CORS origins |
| `MAX_FILE_SIZE` | `10485760` | Max upload size (10MB) |

## Services Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Database     │
│  (Nginx/React)  │     │  (Node/Express) │     │  (PostgreSQL)   │
│    Port 80      │     │    Port 5000    │     │    Port 5432    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                    Docker Network: ticketing-network
```

### Health Checks
- **Frontend:** `GET http://localhost/nginx-health`
- **Backend:** `GET http://localhost:5000/health`
- **Database:** `pg_isready` command

## Database Setup

The database is automatically initialized from `database.sql` on first run.

### Test Accounts (Pre-seeded)

| Role   | Email              | Password   |
|--------|--------------------|------------|
| Admin  | Admin@tnd.dz       | Admin@1234 |
| Agent  | Agent@tnd.dz       | test       |
| Client | Client@ooredoo.dz  | test       |

### Manual Database Import

```bash
# If you need to reimport the schema
docker compose exec db psql -U postgres -d ticketing -f /docker-entrypoint-initdb.d/init.sql
```

## Manual Setup (Without Docker)

```bash
# 1. Start PostgreSQL and create database
createdb ticketing
psql -d ticketing -f database.sql

# 2. Start backend
cd backend
npm install
DB_HOST=localhost npm start

# 3. Start frontend (new terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:5000 npm run dev
```

## Application Routes

### Admin Dashboard (`/dashboard`)
- `/dashboard/admin/all-tickets` – Full queue with filters and assignments
- `/dashboard/admin/manage-users` – User directory with ticket drill-down
- `/dashboard/admin/manage-companies` – Company CRUD interface

### Agent Dashboard
- `/dashboard/tickets` – Assigned tickets and claims

### Client Dashboard
- `/dashboard/client` – Ticket history
- `/create-ticket` – New ticket form

## Production Deployment Checklist

1. [ ] Update `.env` with secure `DB_PASSWORD`
2. [ ] Set `NODE_ENV=production`
3. [ ] Configure `CORS_ORIGINS` for your domain
4. [ ] Set `VITE_API_URL` to your API domain
5. [ ] Remove volume mounts for source code in `docker-compose.yml`
6. [ ] Set up SSL/TLS termination (reverse proxy)
7. [ ] Configure persistent volume backups for `db-data` and `uploads-data`

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs -f [service-name]

# Rebuild from scratch
docker compose down -v
docker compose up --build
```

### Database connection issues
```bash
# Verify database is healthy
docker compose exec db pg_isready -U postgres

# Check backend can reach database
docker compose exec backend wget -qO- http://localhost:5000/health
```

## License

MIT

## Deployment Notes
- Replace hard-coded origins and database credentials with environment variables before deploying.
- Serve the Vite build output (`npm run build`) through your static host and point it to the hosted API.
- Secure all secrets (database passwords, bcrypt salt rounds) via your platform’s configuration management.


