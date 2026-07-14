/*
# Full admin user reset + RLS repair

Deletes and cleanly recreates the admin@temple.com user with every field
GoTrue requires, then re-applies all is_admin() RLS policies.
*/

-- Step 1: Clean slate
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@temple.com');
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@temple.com');
DELETE FROM auth.users WHERE email = 'admin@temple.com';

-- Step 2: Recreate user with all GoTrue-required fields
DO $$
DECLARE
  v_uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    deleted_at,
    banned_until
  ) VALUES (
    v_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@temple.com',
    crypt('Temple@Admin123', gen_salt('bf', 10)),
    now(),
    NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Temple Administrator"}'::jsonb,
    false,
    false,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    NULL
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_uid,
    'admin@temple.com',
    jsonb_build_object('sub', v_uid::text, 'email', 'admin@temple.com', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    email,
    mobile,
    is_active
  ) VALUES (
    v_uid,
    'admin',
    'Temple Administrator',
    'admin@temple.com',
    '',
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        full_name = 'Temple Administrator',
        email = 'admin@temple.com',
        is_active = true,
        updated_at = now();
END $$;

-- Step 3: Ensure is_admin() helper exists (non-recursive)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 4: Fix all RLS policies that used recursive profile subqueries

-- profiles
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- temple_settings
DROP POLICY IF EXISTS "temple_settings_admin_update" ON public.temple_settings;
CREATE POLICY "temple_settings_admin_update" ON public.temple_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "temple_settings_admin_insert" ON public.temple_settings;
CREATE POLICY "temple_settings_admin_insert" ON public.temple_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- temple_timings
DROP POLICY IF EXISTS "timings_admin_write" ON public.temple_timings;
CREATE POLICY "timings_admin_write" ON public.temple_timings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "timings_admin_update" ON public.temple_timings;
CREATE POLICY "timings_admin_update" ON public.temple_timings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "timings_admin_delete" ON public.temple_timings;
CREATE POLICY "timings_admin_delete" ON public.temple_timings FOR DELETE
  TO authenticated USING (public.is_admin());

-- pooja_services
DROP POLICY IF EXISTS "services_admin_read_all" ON public.pooja_services;
CREATE POLICY "services_admin_read_all" ON public.pooja_services FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "services_admin_insert" ON public.pooja_services;
CREATE POLICY "services_admin_insert" ON public.pooja_services FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "services_admin_update" ON public.pooja_services;
CREATE POLICY "services_admin_update" ON public.pooja_services FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "services_admin_delete" ON public.pooja_services;
CREATE POLICY "services_admin_delete" ON public.pooja_services FOR DELETE
  TO authenticated USING (public.is_admin());

-- pooja_service_slots
DROP POLICY IF EXISTS "slots_admin_write" ON public.pooja_service_slots;
CREATE POLICY "slots_admin_write" ON public.pooja_service_slots FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "slots_admin_update" ON public.pooja_service_slots;
CREATE POLICY "slots_admin_update" ON public.pooja_service_slots FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "slots_admin_delete" ON public.pooja_service_slots;
CREATE POLICY "slots_admin_delete" ON public.pooja_service_slots FOR DELETE
  TO authenticated USING (public.is_admin());

-- blocked_service_dates
DROP POLICY IF EXISTS "blocked_dates_admin_write" ON public.blocked_service_dates;
CREATE POLICY "blocked_dates_admin_write" ON public.blocked_service_dates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "blocked_dates_admin_delete" ON public.blocked_service_dates;
CREATE POLICY "blocked_dates_admin_delete" ON public.blocked_service_dates FOR DELETE
  TO authenticated USING (public.is_admin());

-- bookings
DROP POLICY IF EXISTS "bookings_admin_all" ON public.bookings;
CREATE POLICY "bookings_admin_all" ON public.bookings FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
CREATE POLICY "bookings_admin_update" ON public.bookings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- booking_participants
DROP POLICY IF EXISTS "participants_select" ON public.booking_participants;
CREATE POLICY "participants_select" ON public.booking_participants FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.devotee_id = auth.uid())
    OR public.is_admin()
  );
DROP POLICY IF EXISTS "participants_delete" ON public.booking_participants;
CREATE POLICY "participants_delete" ON public.booking_participants FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.devotee_id = auth.uid())
    OR public.is_admin()
  );

-- payments
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments FOR SELECT
  TO authenticated USING (public.is_admin());

-- donations
DROP POLICY IF EXISTS "donations_admin_all" ON public.donations;
CREATE POLICY "donations_admin_all" ON public.donations FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "donations_admin_update" ON public.donations;
CREATE POLICY "donations_admin_update" ON public.donations FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- donation_receipts
DROP POLICY IF EXISTS "receipts_select" ON public.donation_receipts;
CREATE POLICY "receipts_select" ON public.donation_receipts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.donations d WHERE d.id = donation_id AND d.devotee_id = auth.uid())
    OR public.is_admin()
  );

-- events
DROP POLICY IF EXISTS "events_admin_read_all" ON public.events;
CREATE POLICY "events_admin_read_all" ON public.events FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "events_admin_insert" ON public.events;
CREATE POLICY "events_admin_insert" ON public.events FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "events_admin_update" ON public.events;
CREATE POLICY "events_admin_update" ON public.events FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "events_admin_delete" ON public.events;
CREATE POLICY "events_admin_delete" ON public.events FOR DELETE
  TO authenticated USING (public.is_admin());

-- event_registrations
DROP POLICY IF EXISTS "event_reg_admin_all" ON public.event_registrations;
CREATE POLICY "event_reg_admin_all" ON public.event_registrations FOR SELECT
  TO authenticated USING (public.is_admin());

-- announcements
DROP POLICY IF EXISTS "announcements_admin_read_all" ON public.announcements;
CREATE POLICY "announcements_admin_read_all" ON public.announcements FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "announcements_admin_insert" ON public.announcements;
CREATE POLICY "announcements_admin_insert" ON public.announcements FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "announcements_admin_update" ON public.announcements;
CREATE POLICY "announcements_admin_update" ON public.announcements FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "announcements_admin_delete" ON public.announcements;
CREATE POLICY "announcements_admin_delete" ON public.announcements FOR DELETE
  TO authenticated USING (public.is_admin());

-- gallery_albums
DROP POLICY IF EXISTS "albums_admin_write" ON public.gallery_albums;
CREATE POLICY "albums_admin_write" ON public.gallery_albums FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "albums_admin_update" ON public.gallery_albums;
CREATE POLICY "albums_admin_update" ON public.gallery_albums FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "albums_admin_delete" ON public.gallery_albums;
CREATE POLICY "albums_admin_delete" ON public.gallery_albums FOR DELETE
  TO authenticated USING (public.is_admin());

-- gallery_images
DROP POLICY IF EXISTS "images_admin_write" ON public.gallery_images;
CREATE POLICY "images_admin_write" ON public.gallery_images FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "images_admin_update" ON public.gallery_images;
CREATE POLICY "images_admin_update" ON public.gallery_images FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "images_admin_delete" ON public.gallery_images;
CREATE POLICY "images_admin_delete" ON public.gallery_images FOR DELETE
  TO authenticated USING (public.is_admin());

-- admin_activity_logs
DROP POLICY IF EXISTS "activity_admin_select" ON public.admin_activity_logs;
CREATE POLICY "activity_admin_select" ON public.admin_activity_logs FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "activity_admin_insert" ON public.admin_activity_logs;
CREATE POLICY "activity_admin_insert" ON public.admin_activity_logs FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- contact_messages
DROP POLICY IF EXISTS "contact_admin_select" ON public.contact_messages;
CREATE POLICY "contact_admin_select" ON public.contact_messages FOR SELECT
  TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "contact_admin_update" ON public.contact_messages;
CREATE POLICY "contact_admin_update" ON public.contact_messages FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
