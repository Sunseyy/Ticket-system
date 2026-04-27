    CREATE TYPE user_role AS ENUM ('CLIENT', 'AGENT', 'ADMIN');

    CREATE TABLE IF NOT EXISTS public.societies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      contact_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      CONSTRAINT societies_type_check CHECK (type IN ('client', 'tech'))
    );

    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL,
      society_id INTEGER REFERENCES public.societies(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    );
    INSERT INTO public.societies (id, name, type, contact_email) VALUES
    (3, 'ByteWorks', 'tech', 'hello@byteworks.com'),
    (5, 'Algérie Télécom', 'client', NULL),
    (6, 'Fortinet', 'client', NULL),
    (7, 'Ooredoo', 'client', NULL);

    INSERT INTO public.users (id, full_name, email, password_hash, role, society_id) VALUES
    (1, 'sara', 'sarab@gmail.com', '$2b$10$BHGoGG79ShH0lN/oUaNeVODvJOeLxlXDBoy8TQIHvgA/CFauRhc9m', 'AGENT', NULL),
    (6, 'System Admin', 'admin@tnd.dz', '$2b$10$XCVqyB0OKoK6F.CDT8COEuQs22z3WI1oDNnx8SR9rD3fUeiMibaXi', 'ADMIN', NULL),
    (7, 'Agent TnD', 'Agent@tnd.dz', '$2b$10$I7meLngr/f/.2gbNg1iYSuAJE7T2jDjJKoTGfjv0T0.sisI8eJhSq', 'AGENT', NULL),
    (8, 'Client ooredoo', 'Client@ooredoo.dz', '$2b$10$qWqcuBBDohqdnkOSGPdpT./CIcvQ0TaeIV2e7b.sad6gZYPCit6FC', 'CLIENT', 7);

    SELECT pg_catalog.setval('public.users_id_seq', 8, true);
    SELECT pg_catalog.setval('public.societies_id_seq', 10, true);