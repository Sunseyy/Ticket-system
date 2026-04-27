    CREATE TABLE IF NOT EXISTS public.attachments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      comment_id INTEGER,
      uploaded_by INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id
    ON public.attachments(ticket_id);