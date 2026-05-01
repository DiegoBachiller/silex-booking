
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
