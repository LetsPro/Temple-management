-- Enable secure guest seva checkout while keeping member bookings linked to profiles.
ALTER TABLE public.bookings
  ALTER COLUMN devotee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_mobile text NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "bookings_guest_insert" ON public.bookings;
CREATE POLICY "bookings_guest_insert" ON public.bookings
  FOR INSERT TO anon
  WITH CHECK (
    devotee_id IS NULL
    AND char_length(trim(guest_name)) >= 2
    AND char_length(trim(guest_email)) >= 5
    AND char_length(regexp_replace(guest_mobile, '\D', '', 'g')) >= 10
  );

DROP POLICY IF EXISTS "participants_guest_insert" ON public.booking_participants;
CREATE OR REPLACE FUNCTION public.is_guest_booking(target_booking_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = target_booking_id AND devotee_id IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_guest_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guest_booking(uuid) TO anon, authenticated;

CREATE POLICY "participants_guest_insert" ON public.booking_participants
  FOR INSERT TO anon
  WITH CHECK (public.is_guest_booking(booking_id));
