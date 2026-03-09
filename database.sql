--
<<<<<<< HEAD
-- PostgreSQL database dump
--

\restrict oxsfhkST0rrxWu4gL5fNOux3W5C9YdJprwz5n1k06SsWybwKnVwVp3TNoSXiyEd

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)
=======
-- Unified PostgreSQL Database Schema & Seed Data (Formatting-Proof Version)
-- 
>>>>>>> 2c5f9d6f1556c021406bb76049771939f958e08f

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
<<<<<<< HEAD
SELECT pg_catalog.set_config('search_path', '', false);
=======
SET search_path = public;
>>>>>>> 2c5f9d6f1556c021406bb76049771939f958e08f
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
<<<<<<< HEAD

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: societies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.societies (
    id integer NOT NULL,
=======
SET default_tablespace = '';
SET default_table_access_method = heap;

-- 1. ENUM Definitions
CREATE TYPE user_role AS ENUM ('CLIENT', 'AGENT', 'ADMIN');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 2. Auto-update Timestamp Function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Table Definitions
CREATE TABLE public.societies (
    id SERIAL PRIMARY KEY,
>>>>>>> 2c5f9d6f1556c021406bb76049771939f958e08f
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    contact_email character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
<<<<<<< HEAD
    CONSTRAINT societies_type_check CHECK (((type)::text = ANY ((ARRAY['client'::character varying, 'tech'::character varying])::text[])))
);


ALTER TABLE public.societies OWNER TO postgres;

--
-- Name: societies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.societies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.societies_id_seq OWNER TO postgres;

--
-- Name: societies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.societies_id_seq OWNED BY public.societies.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
=======
    deleted_at timestamp without time zone,
    CONSTRAINT societies_type_check CHECK (((type)::text = ANY ((ARRAY['client'::character varying, 'tech'::character varying])::text[])))
);

CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    full_name character varying(255) NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role user_role NOT NULL,
    society_id integer REFERENCES public.societies(id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

CREATE TABLE public.tickets (
    id SERIAL PRIMARY KEY,
>>>>>>> 2c5f9d6f1556c021406bb76049771939f958e08f
    title text NOT NULL,
    description text NOT NULL,
    product character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
<<<<<<< HEAD
    priority character varying(20) NOT NULL,
    urgency character varying(20),
    status character varying(30) DEFAULT 'OPEN'::character varying NOT NULL,
    created_by integer NOT NULL,
    society_id integer,
    assigned_agent_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tickets_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying])::text[]))),
    CONSTRAINT tickets_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying])::text[])))
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    society_id integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENT'::character varying, 'AGENT'::character varying, 'ADMIN'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: societies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.societies ALTER COLUMN id SET DEFAULT nextval('public.societies_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, ticket_id, user_id, content, created_at) FROM stdin;
1	2	1	test\n	2026-02-16 12:24:10.64875
2	2	1	try to log in\n	2026-02-16 12:25:24.157223
3	2	5	thx	2026-02-16 16:07:15.369399
\.


--
-- Data for Name: societies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.societies (id, name, type, contact_email, created_at, updated_at) FROM stdin;
3	ByteWorks	tech	hello@byteworks.com	2026-02-13 12:48:05.577654	2026-02-13 12:48:05.577654
5	Algérie Télécom	client	\N	2026-02-14 16:27:11.905073	2026-02-14 16:27:11.905073
6	Fortinet	client	\N	2026-02-14 16:27:11.905073	2026-02-14 16:27:11.905073
7	Ooredoo	client	\N	2026-02-14 16:27:11.905073	2026-02-14 16:27:11.905073
8	Natixis	client	\N	2026-02-14 16:27:11.905073	2026-02-14 16:27:11.905073
9	Ericsson	client	\N	2026-02-14 16:27:11.905073	2026-02-14 16:27:11.905073
10	Société Générale	client	\N	2026-02-14 16:27:11.905073	2026-02-14 16:27:11.905073
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, title, description, product, category, department, priority, urgency, status, created_by, society_id, assigned_agent_id, created_at, updated_at) FROM stdin;
2	test	hello 	Fortinet	test	info	High	Medium	OPEN	5	6	\N	2026-02-16 12:17:00.966489	2026-02-16 12:17:00.966489
1	bdj	hebdhjb	Cisco	hjdbw	wdbhj	Low	Low	IN_PROGRESS	1	\N	1	2026-02-14 22:06:37.333121	2026-02-16 14:20:17.949584
3	Internet Not Working	My home fiber connection has been down since yesterday evening around 8 PM.\nThe router shows a red LOS light and I have no internet access.\nI tried restarting the router multiple times but it didn’t fix the issue.\nPlease check if there is an outage in my area or if a technician needs to visit.\n\nCustomer ID: 4567821\nPhone: 05XXXXXXXX	Cisco	Internet / Fiber	/	High	High	OPEN	8	7	\N	2026-02-16 16:41:56.030648	2026-02-16 16:41:56.030648
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password_hash, role, society_id, created_at) FROM stdin;
1	sara	sarab@gmail.com	$2b$10$BHGoGG79ShH0lN/oUaNeVODvJOeLxlXDBoy8TQIHvgA/CFauRhc9m	AGENT	\N	2026-02-14 19:16:32.908648
5	sarah	sarawb@gmail.com	$2b$10$o5uJAm03bERetDtzxor1YuEV.B2oRcYW5VWikEqRB0VE7qUTZPwmy	CLIENT	6	2026-02-14 18:25:03.354848
6	System Admin	admin@tnd.dz	$2b$10$XCVqyB0OKoK6F.CDT8COEuQs22z3WI1oDNnx8SR9rD3fUeiMibaXi	ADMIN	\N	2026-02-15 16:33:41.725468
7	Agent TnD	Agent@tnd.dz	$2b$10$I7meLngr/f/.2gbNg1iYSuAJE7T2jDjJKoTGfjv0T0.sisI8eJhSq	AGENT	\N	2026-02-16 16:36:05.274116
8	Client ooredoo	Client@ooredoo.dz	$2b$10$qWqcuBBDohqdnkOSGPdpT./CIcvQ0TaeIV2e7b.sad6gZYPCit6FC	CLIENT	7	2026-02-16 16:36:51.993931
\.


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 3, true);


--
-- Name: societies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.societies_id_seq', 10, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tickets_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: societies societies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.societies
    ADD CONSTRAINT societies_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: tickets fk_assigned_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_assigned_agent FOREIGN KEY (assigned_agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: comments fk_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fk_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets fk_ticket_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tickets fk_ticket_society; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_society FOREIGN KEY (society_id) REFERENCES public.societies(id) ON DELETE SET NULL;


--
-- Name: comments fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_society_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_society_id_fkey FOREIGN KEY (society_id) REFERENCES public.societies(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict oxsfhkST0rrxWu4gL5fNOux3W5C9YdJprwz5n1k06SsWybwKnVwVp3TNoSXiyEd

=======
    priority ticket_priority DEFAULT 'MEDIUM'::ticket_priority NOT NULL,
    urgency character varying(20),
    status ticket_status DEFAULT 'OPEN'::ticket_status NOT NULL,
    created_by integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    society_id integer REFERENCES public.societies(id) ON DELETE SET NULL,
    assigned_agent_id integer REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    CONSTRAINT tickets_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying])::text[])))
);

CREATE TABLE public.comments (
    id SERIAL PRIMARY KEY,
    ticket_id integer NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);

CREATE TABLE public.attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES public.tickets(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES public.comments(id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES public.users(id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

-- 4. Triggers for Auto-Updating 'updated_at'
CREATE TRIGGER update_societies_modtime BEFORE UPDATE ON public.societies FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_tickets_modtime BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_comments_modtime BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. Data Insertion (Converted from COPY to secure INSERT statements)
INSERT INTO public.societies (id, name, type, contact_email, created_at, updated_at) VALUES
(3, 'ByteWorks', 'tech', 'hello@byteworks.com', '2026-02-13 12:48:05.577654', '2026-02-13 12:48:05.577654'),
(5, 'Algérie Télécom', 'client', NULL, '2026-02-14 16:27:11.905073', '2026-02-14 16:27:11.905073'),
(6, 'Fortinet', 'client', NULL, '2026-02-14 16:27:11.905073', '2026-02-14 16:27:11.905073'),
(7, 'Ooredoo', 'client', NULL, '2026-02-14 16:27:11.905073', '2026-02-14 16:27:11.905073'),
(8, 'Natixis', 'client', NULL, '2026-02-14 16:27:11.905073', '2026-02-14 16:27:11.905073'),
(9, 'Ericsson', 'client', NULL, '2026-02-14 16:27:11.905073', '2026-02-14 16:27:11.905073'),
(10, 'Société Générale', 'client', NULL, '2026-02-14 16:27:11.905073', '2026-02-14 16:27:11.905073');

INSERT INTO public.users (id, full_name, email, password_hash, role, society_id, created_at) VALUES
(1, 'sara', 'sarab@gmail.com', '$2b$10$BHGoGG79ShH0lN/oUaNeVODvJOeLxlXDBoy8TQIHvgA/CFauRhc9m', 'AGENT', NULL, '2026-02-14 19:16:32.908648'),
(5, 'sarah', 'sarawb@gmail.com', '$2b$10$o5uJAm03bERetDtzxor1YuEV.B2oRcYW5VWikEqRB0VE7qUTZPwmy', 'CLIENT', 6, '2026-02-14 18:25:03.354848'),
(6, 'System Admin', 'admin@tnd.dz', '$2b$10$XCVqyB0OKoK6F.CDT8COEuQs22z3WI1oDNnx8SR9rD3fUeiMibaXi', 'ADMIN', NULL, '2026-02-15 16:33:41.725468'),
(7, 'Agent TnD', 'Agent@tnd.dz', '$2b$10$I7meLngr/f/.2gbNg1iYSuAJE7T2jDjJKoTGfjv0T0.sisI8eJhSq', 'AGENT', NULL, '2026-02-16 16:36:05.274116'),
(8, 'Client ooredoo', 'Client@ooredoo.dz', '$2b$10$qWqcuBBDohqdnkOSGPdpT./CIcvQ0TaeIV2e7b.sad6gZYPCit6FC', 'CLIENT', 7, '2026-02-16 16:36:51.993931');

INSERT INTO public.tickets (id, title, description, product, category, department, priority, urgency, status, created_by, society_id, assigned_agent_id, created_at, updated_at) VALUES
(2, 'test', 'hello', 'Fortinet', 'test', 'info', 'HIGH', 'Medium', 'OPEN', 5, 6, NULL, '2026-02-16 12:17:00.966489', '2026-02-16 12:17:00.966489'),
(1, 'bdj', 'hebdhjb', 'Cisco', 'hjdbw', 'wdbhj', 'LOW', 'Low', 'IN_PROGRESS', 1, NULL, 1, '2026-02-14 22:06:37.333121', '2026-02-16 14:20:17.949584'),
(3, 'Internet Not Working', 'My home fiber connection has been down since yesterday evening around 8 PM.', 'Cisco', 'Internet / Fiber', '/', 'HIGH', 'High', 'OPEN', 8, 7, NULL, '2026-02-16 16:41:56.030648', '2026-02-16 16:41:56.030648');

INSERT INTO public.comments (id, ticket_id, user_id, content, created_at) VALUES
(1, 2, 1, 'test', '2026-02-16 12:24:10.64875'),
(2, 2, 1, 'try to log in', '2026-02-16 12:25:24.157223'),
(3, 2, 5, 'thx', '2026-02-16 16:07:15.369399');

-- 6. Sequence Resets
SELECT pg_catalog.setval('public.societies_id_seq', 10, true);
SELECT pg_catalog.setval('public.users_id_seq', 8, true);
SELECT pg_catalog.setval('public.tickets_id_seq', 3, true);
SELECT pg_catalog.setval('public.comments_id_seq', 3, true);

-- 7. Performance Indexes
CREATE INDEX idx_users_society_id ON public.users(society_id);
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX idx_tickets_assigned_agent ON public.tickets(assigned_agent_id);
CREATE INDEX idx_tickets_society_id ON public.tickets(society_id);
CREATE INDEX idx_comments_ticket_id ON public.comments(ticket_id);
CREATE INDEX idx_attachments_ticket_id ON public.attachments(ticket_id);
>>>>>>> 2c5f9d6f1556c021406bb76049771939f958e08f
