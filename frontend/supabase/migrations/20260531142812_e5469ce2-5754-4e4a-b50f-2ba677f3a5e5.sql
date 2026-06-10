
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
