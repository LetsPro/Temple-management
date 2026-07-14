/*
  Repairs the initial admin setup:
  1. Removes recursive access checks from profiles RLS.
  2. Normalizes nullable Auth token fields left incomplete by the original
     direct auth.users insert so GoTrue can read the administrator account.

  New administrator accounts should be created with the Supabase server-side
  auth.admin.createUser API, never by browser code or direct auth table writes.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Normalize every text field GoTrue expects to scan as a non-null string.
DO $repair$
DECLARE
  column_name text;
BEGIN
  FOREACH column_name IN ARRAY ARRAY[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = 'auth'
        AND c.table_name = 'users'
        AND c.column_name = column_name
    ) THEN
      EXECUTE format(
        'UPDATE auth.users SET %I = COALESCE(%I, '''') WHERE email = $1',
        column_name,
        column_name
      ) USING 'admin@temple.com';
    END IF;
  END LOOP;
END
$repair$;

UPDATE public.profiles
SET role = 'admin',
    full_name = 'Temple Administrator',
    email = 'admin@temple.com',
    is_active = true,
    updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@temple.com');
