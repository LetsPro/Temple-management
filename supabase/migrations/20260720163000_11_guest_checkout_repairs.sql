/* Guest checkout support for seva bookings and public event registrations. */

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

CREATE OR REPLACE FUNCTION public.is_guest_booking(target_booking_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE id = target_booking_id AND devotee_id IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_guest_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guest_booking(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "participants_guest_insert" ON public.booking_participants;
CREATE POLICY "participants_guest_insert" ON public.booking_participants
  FOR INSERT TO anon
  WITH CHECK (public.is_guest_booking(booking_id));

ALTER TABLE public.event_registrations
  ALTER COLUMN devotee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_mobile text NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "event_reg_guest_insert" ON public.event_registrations;
CREATE POLICY "event_reg_guest_insert" ON public.event_registrations
  FOR INSERT TO anon
  WITH CHECK (
    devotee_id IS NULL
    AND char_length(trim(guest_name)) >= 2
    AND char_length(trim(guest_email)) >= 5
    AND char_length(regexp_replace(guest_mobile, '\D', '', 'g')) >= 10
    AND (
      (
        status = 'registered'
        AND payment_status = 'not_required'
        AND event_plan_id IS NULL
        AND amount = 0
        AND EXISTS (
          SELECT 1
          FROM public.events
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'free'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
        )
      )
      OR
      (
        status = 'pending'
        AND payment_status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.events
          JOIN public.event_plans ON event_plans.event_id = events.id
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'paid'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
            AND event_plans.id = event_registrations.event_plan_id
            AND event_plans.is_active = true
            AND event_plans.price = event_registrations.amount
        )
      )
    )
  );
