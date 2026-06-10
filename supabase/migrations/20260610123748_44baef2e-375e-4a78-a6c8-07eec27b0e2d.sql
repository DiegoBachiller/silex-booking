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
