-- =============================================================
-- SILEX — Bootstrap completo de la base de datos
-- Genera todas las tablas, RLS, triggers y datos semilla.
-- Pegar entero en Supabase Dashboard → SQL Editor → Run.
-- Idempotente: se puede ejecutar varias veces sin romper.
-- =============================================================


-- -----------------------------------------------------------
-- Migration: 20260501191335_2eb084ec-1c63-4d04-a603-c13d8f60c101.sql
-- -----------------------------------------------------------

-- Workers
CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  color text NOT NULL DEFAULT '#6366f1',
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30,
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Worker <-> Services
CREATE TABLE public.worker_services (
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, service_id)
);

-- Weekly schedules: day_of_week 0=Sun..6=Sat
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_schedules_worker ON public.schedules(worker_id);

-- Holidays (worker_id NULL = global)
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_holidays_dates ON public.holidays(start_date, end_date);

-- Appointments
CREATE TYPE public.appointment_status AS ENUM ('scheduled','completed','cancelled','no_show');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  source text NOT NULL DEFAULT 'manual', -- 'manual' | 'ai'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_appt_worker_time ON public.appointments(worker_id, starts_at);
CREATE INDEX idx_appt_starts ON public.appointments(starts_at);

-- AI Profile (singleton row)
CREATE TABLE public.ai_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL DEFAULT 'Silex Assistant',
  voice text NOT NULL DEFAULT 'rachel',
  tone text NOT NULL DEFAULT 'friendly',
  language text NOT NULL DEFAULT 'es',
  greeting text NOT NULL DEFAULT '¡Hola! Soy tu asistente. ¿En qué puedo ayudarte?',
  business_name text NOT NULL DEFAULT 'Mi Negocio',
  business_hours_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_profile DEFAULT VALUES;

-- API keys for AI tool endpoints
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_appt_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_aiprof_updated BEFORE UPDATE ON public.ai_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: single-tenant, no auth — allow all from anon for app tables
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.worker_services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.holidays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.ai_profile FOR ALL USING (true) WITH CHECK (true);

-- api_keys: NO public access — only service role (server) can read keys
-- (no policies = denied for anon/auth roles, service role bypasses RLS)


-- -----------------------------------------------------------
-- Migration: 20260501191358_66932c01-1be7-4f10-b13c-e0bf87c3bc5b.sql
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;


-- -----------------------------------------------------------
-- Migration: 20260507190702_31a841c4-3637-43d4-a2d8-6790aef5a8a1.sql
-- -----------------------------------------------------------

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles viewable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- trigger to populate profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- realtime + index
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON public.appointments(starts_at);


-- -----------------------------------------------------------
-- Migration: 20260530161513_6b5d88a5-dc78-41a1-ba8b-947fd71f4541.sql
-- -----------------------------------------------------------
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.customers FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_customers_phone ON public.customers (phone);
CREATE INDEX idx_customers_email ON public.customers (email);
CREATE INDEX idx_customers_name ON public.customers (name);

-- -----------------------------------------------------------
-- Migration: 20260531142812_e5469ce2-5754-4e4a-b50f-2ba677f3a5e5.sql
-- -----------------------------------------------------------

-- Tighten RLS: drop public-all policies, restrict to authenticated users.
-- Single-tenant: any authenticated admin can manage everything.
-- Public endpoints (/api/public/booking/*, /api/public/ai-tools/*) keep working
-- because they use supabaseAdmin (service role) which bypasses RLS.

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','appointments','workers','services','worker_services','schedules','holidays','ai_profile']
  LOOP
    -- drop existing policies
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- ensure RLS enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- authenticated-only policy
    EXECUTE format(
      'CREATE POLICY "authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );

    -- revoke anon, ensure authenticated + service_role grants
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;


-- -----------------------------------------------------------
-- Migration: 20260610123748_44baef2e-375e-4a78-a6c8-07eec27b0e2d.sql
-- -----------------------------------------------------------
-- Tighten profiles SELECT to own row
DROP POLICY IF EXISTS "profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "users select own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Lock down SECURITY DEFINER functions: only postgres/service_role may execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

