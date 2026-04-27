    CREATE TYPE user_role AS ENUM ('CLIENT', 'AGENT', 'ADMIN');
    CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED');
    CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Lightweight users table (read-only reference, synced from user-service)
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      role user_role NOT NULL,
      deleted_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS public.tickets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      product VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      priority ticket_priority DEFAULT 'MEDIUM' NOT NULL,
      urgency VARCHAR(20),
      status ticket_status DEFAULT 'OPEN' NOT NULL,
      created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      society_id INTEGER,
      assigned_agent_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      CONSTRAINT tickets_urgency_check CHECK (urgency IN ('Low', 'Medium', 'High'))
    );

    CREATE TABLE IF NOT EXISTS public.comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS public.attachments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER REFERENCES public.tickets(id) ON DELETE CASCADE,
      comment_id INTEGER REFERENCES public.comments(id) ON DELETE CASCADE,
      uploaded_by INTEGER NOT NULL REFERENCES public.users(id),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    );

    CREATE TRIGGER update_tickets_modtime BEFORE UPDATE ON public.tickets
      FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    CREATE TRIGGER update_comments_modtime BEFORE UPDATE ON public.comments
      FOR EACH ROW EXECUTE FUNCTION update_modified_column();

    -- Seed users (lightweight copy)
    INSERT INTO public.users (id, full_name, role) VALUES
    (1, 'sara', 'AGENT'),
    (5, 'sarah', 'CLIENT'),
    (6, 'System Admin', 'ADMIN'),
    (7, 'Agent TnD', 'AGENT'),
    (8, 'Client ooredoo', 'CLIENT');

    -- Seed tickets
    INSERT INTO public.tickets (id, title, description, product, category, department, priority, urgency, status, created_by, society_id, assigned_agent_id, created_at, updated_at) VALUES
    (2, 'test', 'hello', 'Fortinet', 'test', 'info', 'HIGH', 'Medium', 'OPEN', 5, 6, NULL, '2026-02-16 12:17:00', '2026-02-16 12:17:00'),
    (1, 'bdj', 'hebdhjb', 'Cisco', 'hjdbw', 'wdbhj', 'LOW', 'Low', 'IN_PROGRESS', 1, NULL, 1, '2026-02-14 22:06:37', '2026-02-16 14:20:17'),
    (3, 'Internet Not Working', 'My home fiber connection has been down since yesterday.', 'Cisco', 'Internet / Fiber', '/', 'HIGH', 'High', 'OPEN', 8, 7, NULL, '2026-02-16 16:41:56', '2026-02-16 16:41:56');

    -- Seed comments
    INSERT INTO public.comments (id, ticket_id, user_id, content, created_at) VALUES
    (1, 2, 1, 'test', '2026-02-16 12:24:10'),
    (2, 2, 1, 'try to log in', '2026-02-16 12:25:24'),
    (3, 2, 5, 'thx', '2026-02-16 16:07:15');

    SELECT pg_catalog.setval('public.tickets_id_seq', 3, true);
    SELECT pg_catalog.setval('public.comments_id_seq', 3, true);
    SELECT pg_catalog.setval('public.users_id_seq', 8, true);

    -- Indexes
    CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
    CREATE INDEX idx_tickets_assigned_agent ON public.tickets(assigned_agent_id);
    CREATE INDEX idx_comments_ticket_id ON public.comments(ticket_id);
    CREATE INDEX idx_attachments_ticket_id ON public.attachments(ticket_id);
